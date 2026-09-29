using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Windows;
using Microsoft.Web.WebView2.Core;
using Microsoft.Win32;

namespace SectorRotationTerminal.Services;

internal sealed class DesktopBridge
{
    private readonly CoreWebView2 _webView;
    private readonly string _storeRoot;
    private readonly Window _owner;

    public DesktopBridge(CoreWebView2 webView, string storeRoot, Window owner)
    {
        _webView = webView;
        _storeRoot = storeRoot;
        _owner = owner;
        Directory.CreateDirectory(_storeRoot);
        _webView.WebMessageReceived += WebMessageReceived;
    }

    public const string BootstrapScript = """
(() => {
  if (window.claude && window.claude.__sectorDesktop) return;
  let seq = 0;
  const pending = new Map();
  const call = (action, payload) => new Promise((resolve, reject) => {
    const id = String(++seq);
    pending.set(id, { resolve, reject });
    window.chrome.webview.postMessage({ source: "sector-terminal", id, action, payload });
  });
  window.chrome.webview.addEventListener("message", event => {
    const message = event.data || {};
    if (message.source !== "sector-terminal" || !pending.has(message.id)) return;
    const operation = pending.get(message.id);
    pending.delete(message.id);
    if (message.ok) operation.resolve(message.value);
    else operation.reject(Object.assign(new Error(message.error || "Desktop operation failed"), { code: message.code || "desktop_error" }));
  });
  const doc = path => ({
    get: () => call("db.get", { path }).then(value => ({ exists: value !== null, data: () => value })),
    set: value => call("db.set", { path, value }),
    delete: () => call("db.delete", { path })
  });
  const downloads = {
    save: async request => {
      let data = request && request.data;
      let encoding = "text";
      if (data instanceof Blob) {
        const bytes = new Uint8Array(await data.arrayBuffer());
        let binary = "";
        for (let offset = 0; offset < bytes.length; offset += 0x8000) {
          binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + 0x8000));
        }
        data = btoa(binary);
        encoding = "base64";
      } else if (typeof data !== "string") {
        data = JSON.stringify(data == null ? "" : data);
      }
      return call("download.save", { filename: request.filename || "download.txt", data, encoding });
    }
  };
  window.claude = {
    __sectorDesktop: true,
    use: capability => {
      if (capability === "db") return Promise.resolve({ doc });
      if (capability === "downloads") return Promise.resolve(downloads);
      if (capability === "sample") return Promise.resolve(null);
      return Promise.resolve(null);
    }
  };
})();
""";

    private void WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        string? id = null;
        try
        {
            if (!Uri.TryCreate(e.Source, UriKind.Absolute, out var source) ||
                source.Scheme != Uri.UriSchemeHttps ||
                !source.Host.Equals("sector-terminal.local", StringComparison.OrdinalIgnoreCase)) return;
            var message = JsonNode.Parse(e.WebMessageAsJson)?.AsObject()
                          ?? throw new InvalidOperationException("Invalid desktop message.");
            if (message["source"]?.GetValue<string>() != "sector-terminal") return;
            id = message["id"]?.GetValue<string>();
            var action = message["action"]?.GetValue<string>();
            var payload = message["payload"]?.AsObject() ?? new JsonObject();
            JsonNode? value = action switch
            {
                "db.get" => ReadDocument(DocumentPath(payload)),
                "db.set" => WriteDocument(DocumentPath(payload), payload["value"]),
                "db.delete" => DeleteDocument(DocumentPath(payload)),
                "download.save" => SaveDownload(payload),
                _ => throw new InvalidOperationException("Unsupported desktop operation: " + action)
            };
            Reply(id, true, value, null, null);
        }
        catch (Exception ex)
        {
            Reply(id, false, null, ex.Message, ex is OperationCanceledException ? "declined" : "desktop_error");
        }
    }

    private string DocumentPath(JsonObject payload)
    {
        var logical = payload["path"]?.GetValue<string>() ?? throw new InvalidOperationException("Document path is required.");
        var safe = logical.Split('/', StringSplitOptions.RemoveEmptyEntries)
            .Select(part => string.Concat(part.Select(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_' or '.' ? ch : '_')))
            .Where(part => part.Length > 0)
            .ToArray();
        if (safe.Length == 0) throw new InvalidOperationException("Document path is invalid.");
        var path = Path.Combine(new[] { _storeRoot }.Concat(safe).ToArray()) + ".json";
        var full = Path.GetFullPath(path);
        if (!full.StartsWith(Path.GetFullPath(_storeRoot) + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Document path escapes the application store.");
        return full;
    }

    private static JsonNode? ReadDocument(string path) =>
        File.Exists(path) ? JsonNode.Parse(File.ReadAllText(path, Encoding.UTF8)) : null;

    private static JsonNode WriteDocument(string path, JsonNode? value)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var temporary = path + ".tmp";
        File.WriteAllText(temporary, value?.ToJsonString() ?? "null", new UTF8Encoding(false));
        File.Move(temporary, path, true);
        return JsonValue.Create(true)!;
    }

    private static JsonNode DeleteDocument(string path)
    {
        if (File.Exists(path)) File.Delete(path);
        return JsonValue.Create(true)!;
    }

    private JsonNode SaveDownload(JsonObject payload)
    {
        var suggested = Path.GetFileName(payload["filename"]?.GetValue<string>() ?? "download.txt");
        var dialog = new SaveFileDialog
        {
            FileName = suggested,
            Filter = "All files (*.*)|*.*",
            AddExtension = true,
            OverwritePrompt = true
        };
        if (dialog.ShowDialog(_owner) != true) throw new OperationCanceledException("Save cancelled.");
        var data = payload["data"]?.GetValue<string>() ?? "";
        if (payload["encoding"]?.GetValue<string>() == "base64") File.WriteAllBytes(dialog.FileName, Convert.FromBase64String(data));
        else File.WriteAllText(dialog.FileName, data, new UTF8Encoding(false));
        return JsonValue.Create(dialog.FileName)!;
    }

    private void Reply(string? id, bool ok, JsonNode? value, string? error, string? code)
    {
        var response = new JsonObject
        {
            ["source"] = "sector-terminal",
            ["id"] = id,
            ["ok"] = ok,
            ["value"] = value?.DeepClone(),
            ["error"] = error,
            ["code"] = code
        };
        _webView.PostWebMessageAsJson(response.ToJsonString());
    }
}
