import Foundation

#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

enum ChatAttachmentType {
  case image
  case file
  case audio
}

struct ChatAttachment: Identifiable {
  let id: String
  let name: String
  let type: ChatAttachmentType
  let url: URL?
  #if canImport(UIKit)
  let image: UIImage?
  #elseif canImport(AppKit)
  let image: NSImage?
  #endif
}
