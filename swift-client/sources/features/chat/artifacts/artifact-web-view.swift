// CRITICAL
import SwiftUI
import WebKit

#if canImport(UIKit)
import UIKit

struct ArtifactWebView: UIViewRepresentable {
  let htmlContent: String

  func makeUIView(context: Context) -> WKWebView {
    let config = WKWebViewConfiguration()
    config.allowsInlineMediaPlayback = true
    let webView = WKWebView(frame: .zero, configuration: config)
    webView.isOpaque = false
    webView.backgroundColor = UIColor(AppTheme.background)
    webView.scrollView.backgroundColor = UIColor(AppTheme.background)
    webView.loadHTMLString(htmlContent, baseURL: nil)
    return webView
  }

  func updateUIView(_ webView: WKWebView, context: Context) {
    webView.loadHTMLString(htmlContent, baseURL: nil)
  }
}

#elseif canImport(AppKit)
import AppKit

struct ArtifactWebView: NSViewRepresentable {
  let htmlContent: String

  func makeNSView(context: Context) -> WKWebView {
    let config = WKWebViewConfiguration()
    let webView = WKWebView(frame: .zero, configuration: config)
    webView.setValue(false, forKey: "drawsBackground")
    webView.loadHTMLString(htmlContent, baseURL: nil)
    return webView
  }

  func updateNSView(_ webView: WKWebView, context: Context) {
    webView.loadHTMLString(htmlContent, baseURL: nil)
  }
}

#endif
