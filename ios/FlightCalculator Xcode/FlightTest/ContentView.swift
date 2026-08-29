//
//  ContentView.swift
//  FlightCalculator
//
//  Created by ZhuFenY on 17/07/2026.
//

import SwiftUI
import WebKit
import UIKit

struct ContentView: View {
    var body: some View {
        WebView()
            .ignoresSafeArea()
    }
}


final class WebViewCoordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        showError(in: webView, error: error)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        showError(in: webView, error: error)
    }

    func showMessage(in webView: WKWebView, title: String, description: String, details: String) {
        let escapedTitle = escapeHTML(title)
        let escapedDescription = escapeHTML(description)
        let escapedDetails = escapeHTML(details)

        let html = """
        <!doctype html>
        <html lang="zh-CN">
        <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Flight Calculator</title>
        <style>
        body {
            margin: 0;
            padding: 24px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #f7f8fa;
            color: #1a1a1a;
        }
        .card {
            max-width: 680px;
            margin: 48px auto;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.06);
        }
        .title { font-size: 22px; font-weight: 700; margin-bottom: 10px; }
        .desc { color: #6b7280; margin-bottom: 16px; }
        .error {
            padding: 12px 14px;
            border-radius: 10px;
            background: #fef2f2;
            color: #b91c1c;
            word-break: break-word;
        }
        </style>
        </head>
        <body>
            <div class="card">
                <div class="title">\(escapedTitle)</div>
                <div class="desc">\(escapedDescription)</div>
                <div class="error">错误信息: \(escapedDetails)</div>
            </div>
        </body>
        </html>
        """

        webView.loadHTMLString(html, baseURL: nil)
    }

    private func showError(in webView: WKWebView, error: Error) {
        showMessage(
            in: webView,
            title: "Flight Calculator 加载失败",
            description: "本地页面没有成功打开，所以应用无法继续显示内容。",
            details: error.localizedDescription
        )
    }

    private func escapeHTML(_ text: String) -> String {
        text
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptAlertPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping () -> Void
    ) {
        presentAlert(title: "提示", message: message) {
            completionHandler()
        }
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptConfirmPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (Bool) -> Void
    ) {
        presentConfirm(title: "请确认", message: message) { accepted in
            completionHandler(accepted)
        }
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptTextInputPanelWithPrompt prompt: String,
        defaultText: String?,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (String?) -> Void
    ) {
        presentPrompt(title: "输入内容", message: prompt, defaultText: defaultText) { text in
            completionHandler(text)
        }
    }

    private func presentAlert(title: String, message: String, onClose: @escaping () -> Void) {
        presentController(title: title, message: message, preferredStyle: .alert) { controller in
            controller.addAction(UIAlertAction(title: "确定", style: .default) { _ in
                onClose()
            })
        } fallback: {
            onClose()
        }
    }

    private func presentConfirm(title: String, message: String, completion: @escaping (Bool) -> Void) {
        presentController(title: title, message: message, preferredStyle: .alert) { controller in
            controller.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in
                completion(false)
            })
            controller.addAction(UIAlertAction(title: "确定", style: .default) { _ in
                completion(true)
            })
        } fallback: {
            completion(false)
        }
    }

    private func presentPrompt(
        title: String,
        message: String,
        defaultText: String?,
        completion: @escaping (String?) -> Void
    ) {
        presentController(title: title, message: message, preferredStyle: .alert) { controller in
            controller.addTextField { textField in
                textField.text = defaultText
                textField.clearButtonMode = .whileEditing
            }
            controller.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in
                completion(nil)
            })
            controller.addAction(UIAlertAction(title: "确定", style: .default) { _ in
                completion(controller.textFields?.first?.text)
            })
        } fallback: {
            completion(defaultText)
        }
    }

    private func presentController(
        title: String,
        message: String,
        preferredStyle: UIAlertController.Style,
        configure: @escaping (UIAlertController) -> Void,
        fallback: @escaping () -> Void
    ) {
        DispatchQueue.main.async {
            guard let viewController = Self.topViewController() else {
                fallback()
                return
            }

            let controller = UIAlertController(title: title, message: message, preferredStyle: preferredStyle)
            configure(controller)
            viewController.present(controller, animated: true)
        }
    }

    private static func topViewController(
        base: UIViewController? = UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first(where: \.isKeyWindow)?
            .rootViewController
    ) -> UIViewController? {
        if let nav = base as? UINavigationController {
            return topViewController(base: nav.visibleViewController)
        }
        if let tab = base as? UITabBarController {
            return topViewController(base: tab.selectedViewController)
        }
        if let presented = base?.presentedViewController {
            return topViewController(base: presented)
        }
        return base
    }
}

struct WebView: UIViewRepresentable {
    func makeCoordinator() -> WebViewCoordinator {
        WebViewCoordinator()
    }

    func makeUIView(context: Context) -> WKWebView {

        let config = WKWebViewConfiguration()

        let webView = WKWebView(
            frame: .zero,
            configuration: config
        )
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        loadWebApp(webView, coordinator: context.coordinator)

        return webView
    }


    func updateUIView(
        _ webView: WKWebView,
        context: Context
    ) {

    }


    func loadWebApp(_ webView: WKWebView, coordinator: WebViewCoordinator) {

        guard let htmlURL = Bundle.main.url(
            forResource: "index",
            withExtension: "html"
        ) else {
            coordinator.showMessage(
                in: webView,
                title: "Flight Calculator 启动失败",
                description: "应用资源没有被正确打包进安装包，所以首页无法打开。",
                details: "index.html not found in bundle"
            )
            return
        }

        webView.loadFileURL(
            htmlURL,
            allowingReadAccessTo: Bundle.main.bundleURL
        )
    }
}

#Preview {
    ContentView()
}
