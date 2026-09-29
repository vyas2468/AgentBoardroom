using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace SectorRotationTerminal.Services;

internal static class WebBundleBuilder
{
    private const string Marker = "/* ---------- init ---------- */\ndrawQuad();";
    private static readonly Regex LayerName = new(@"^v(?<number>\d+)\.js$", RegexOptions.Compiled);

    public static string Build(string contentRoot, string outputRoot)
    {
        var artifactRoot = Path.Combine(contentRoot, "artifact");
        var sourcePath = Path.Combine(artifactRoot, "base", "orig.html");
        var layerRoot = Path.Combine(artifactRoot, "layers");
        var scanPath = Path.Combine(artifactRoot, "fixtures", "live_scan.json");
        var realTestRoot = Path.Combine(contentRoot, "realtest");

        RequireFile(sourcePath);
        RequireFile(scanPath);
        var layers = Directory.EnumerateFiles(layerRoot, "v*.js")
            .Select(path => (Path: path, Match: LayerName.Match(Path.GetFileName(path))))
            .Where(item => item.Match.Success)
            .OrderBy(item => int.Parse(item.Match.Groups["number"].Value))
            .ToArray();
        if (layers.Length == 0) throw new InvalidOperationException("No Artifact feature layers were packaged.");

        var html = File.ReadAllText(sourcePath, Encoding.UTF8).Replace("\r\n", "\n");
        if (CountOccurrences(html, Marker) != 1)
            throw new InvalidOperationException("The Artifact initialization marker changed; refusing to build an uncertain desktop copy.");
        if (html.Contains("v81: Ask the terminal", StringComparison.Ordinal))
            throw new InvalidOperationException("The base page already contains feature layers; refusing to duplicate them.");

        var layerText = string.Join("\n", layers.Select(item => File.ReadAllText(item.Path, Encoding.UTF8)));
        layerText = layerText
            .Replace("__HX_RTS__", JsonString(ReadLatin1(Path.Combine(realTestRoot, "AlexAligned_Unified_v7_E_History_26.09.2026.rts"))))
            .Replace("__HX_PS1__", JsonString(ReadLatin1(Path.Combine(realTestRoot, "run_v7_history.ps1"))))
            .Replace("__HX_BAT__", JsonString(ReadLatin1(Path.Combine(realTestRoot, "Run_AlexAligned_v7_History.bat"))));
        if (layerText.Contains("__HX_", StringComparison.Ordinal))
            throw new InvalidOperationException("An embedded RealTest placeholder was not resolved.");

        html = html.Replace(Marker, layerText + "\n" + Marker, StringComparison.Ordinal)
            .Replace("<div class=\"eyebrow\">AlexAligned Cross-Sectional Master v3 &middot; RealTest scan</div>",
                     "<div class=\"eyebrow\">CROSS-SECTIONAL MASTER - RT SCAN</div>", StringComparison.Ordinal)
            .Replace("Deterministic engines only &mdash; StepMA with Alex bands,",
                     "Deterministic engines only &mdash; StepMA,", StringComparison.Ordinal);

        var scanJson = File.ReadAllText(scanPath, Encoding.UTF8);
        using (JsonDocument.Parse(scanJson)) { }
        var fingerprint = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(html + scanJson))).ToLowerInvariant()[..16];
        var target = Path.Combine(outputRoot, fingerprint);
        Directory.CreateDirectory(target);
        WriteAtomic(Path.Combine(target, "index.html"), html);
        WriteAtomic(Path.Combine(target, "data.js"), "window.SCAN=" + scanJson + ";\n");
        return target;
    }

    private static string ReadLatin1(string path)
    {
        RequireFile(path);
        return File.ReadAllText(path, Encoding.Latin1).Replace("\r\n", "\n").Replace("\n", "\r\n");
    }

    private static string JsonString(string value) =>
        JsonSerializer.Serialize(value).Replace("</", "<\\/", StringComparison.Ordinal);

    private static int CountOccurrences(string text, string value)
    {
        var count = 0;
        for (var index = 0; (index = text.IndexOf(value, index, StringComparison.Ordinal)) >= 0; index += value.Length) count++;
        return count;
    }

    private static void RequireFile(string path)
    {
        if (!File.Exists(path)) throw new FileNotFoundException("A required desktop application file is missing.", path);
    }

    private static void WriteAtomic(string path, string content)
    {
        var temporary = path + ".tmp";
        File.WriteAllText(temporary, content, new UTF8Encoding(false));
        File.Move(temporary, path, true);
    }
}
