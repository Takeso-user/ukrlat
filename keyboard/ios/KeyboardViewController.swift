import SwiftUI
import UIKit

@objc(KeyboardViewController)
final class KeyboardViewController: UIInputViewController {
    private let model = UkrLatKeyboardModel()
    private var hostingController: UIHostingController<UkrLatKeyboardView>?
    private var heightConstraint: NSLayoutConstraint?

    override func viewDidLoad() {
        super.viewDidLoad()

        model.controller = self
        let rootView = UkrLatKeyboardView(model: model)
        let host = UIHostingController(rootView: rootView)
        host.view.backgroundColor = .clear
        host.view.translatesAutoresizingMaskIntoConstraints = false

        addChild(host)
        view.addSubview(host.view)
        host.didMove(toParent: self)

        let preferredHeight: CGFloat = UIDevice.current.userInterfaceIdiom == .pad ? 268 : 226
        let height = view.heightAnchor.constraint(equalToConstant: preferredHeight)
        height.priority = UILayoutPriority(999)
        heightConstraint = height

        NSLayoutConstraint.activate([
            host.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            host.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            host.view.topAnchor.constraint(equalTo: view.topAnchor),
            host.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            height,
        ])

        hostingController = host
        model.syncFromProxy()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        model.syncFromProxy()
    }

    override func textWillChange(_ textInput: (any UITextInput)?) {
        super.textWillChange(textInput)
    }

    override func textDidChange(_ textInput: (any UITextInput)?) {
        super.textDidChange(textInput)
        model.syncFromProxy()
    }
}
