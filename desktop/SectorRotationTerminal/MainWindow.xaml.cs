using System.Diagnostics;
using System.IO;
using System.Windows;
using Microsoft.Web.WebView2.Core;
using SectorRotationTerminal.Services;

namespace SectorRotationTerminal;

public partial class MainWindow : Window
{
    private const string AppHost = "sector-terminal.local";
    private readonly string _appDataRoot = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "SectorRotationTerminal");
    private DesktopBridge? _bridge;

    public MainWindow()
    {
        InitializeComponent();
        Loaded += MainWindow_Loaded;
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        try
        {
            Directory.CreateDirectory(_appDataRoot);
            StartupMessage.Text = "Building the desktop copy from the checked-in Artifact source…";
            var webRoot = await Task.Run(() => WebBundleBuilder.Build(
                Path.Combine(AppContext.BaseDirectory, "AppContent"),
                Path.Combine(_appDataRoot, "Web")));

            StartupMessage.Text = "Starting the secure local browser…";
            var environment = await CoreWebView2Environment.CreateAsync(
                userDataFolder: Path.Combine(_appDataRoot, "WebView2"));
            await TerminalView.EnsureCoreWebView2Async(environment);

            _bridge = new DesktopBridge(
                TerminalView.CoreWebView2,
                Path.Combine(_appDataRoot, "Store"),
                this);
            await TerminalView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(
                DesktopBridge.BootstrapScript);

            TerminalView.CoreWebView2.SetVirtualHostNameToFolderMapping(
                AppHost,
                webRoot,
                CoreWebView2HostResourceAccessKind.DenyCors);
            TerminalView.CoreWebView2.NavigationStarting += (_, args) =>
            {
                if (Uri.TryCreate(args.Uri, UriKind.Absolute, out var uri) &&
                    uri.Scheme == Uri.UriSchemeHttps &&
                    uri.Host.Equals(AppHost, StringComparison.OrdinalIgnoreCase)) return;
                args.Cancel = true;
                if (Uri.TryCreate(args.Uri, UriKind.Absolute, out uri) &&
                    (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp))
                {
                    Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
                }
            };
            TerminalView.CoreWebView2.NavigationCompleted += (_, args) =>
            {
                StartupOverlay.Visibility = Visibility.Collapsed;
                StatusText.Text = args.IsSuccess
                    ? "Local desktop edition · Data remains on this computer"
                    : $"Navigation failed: {args.WebErrorStatus}";
            };
            TerminalView.CoreWebView2.NewWindowRequested += (_, args) =>
            {
                args.Handled = true;
                if (Uri.TryCreate(args.Uri, UriKind.Absolute, out var uri) &&
                    (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp))
                {
                    Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
                }
            };
            NavigateHome();
        }
        catch (Exception ex)
        {
            StartupMessage.Text = "The desktop terminal could not start.\n\n" + ex.Message;
            StatusText.Text = "Startup failed";
        }
    }

    private void NavigateHome() => TerminalView.Source = new Uri($"https://{AppHost}/index.html");

    private void HomeButton_Click(object sender, RoutedEventArgs e) => NavigateHome();

    private void ReloadButton_Click(object sender, RoutedEventArgs e) => TerminalView.CoreWebView2?.Reload();

    private void DataFolderButton_Click(object sender, RoutedEventArgs e)
    {
        Directory.CreateDirectory(_appDataRoot);
        Process.Start(new ProcessStartInfo(_appDataRoot) { UseShellExecute = true });
    }
}
