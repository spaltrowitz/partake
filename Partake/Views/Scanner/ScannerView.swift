import SwiftUI
import VisionKit
import PhotosUI

struct ScannerView: View {
    @StateObject private var viewModel = ScannerViewModel()
    @State private var showCamera = false
    @State private var showPhotosPicker = false
    @State private var selectedPhoto: PhotosPickerItem?
    @Binding var scannedBill: Bill?
    @Environment(\.dismiss) private var dismiss

    var participants: [Participant]
    var createdBy: String

    var body: some View {
        NavigationStack {
            VStack(spacing: PartakeTheme.spacingLG) {
                if let receipt = viewModel.parsedReceipt {
                    ReceiptEditView(
                        receipt: Binding(
                            get: { receipt },
                            set: { viewModel.parsedReceipt = $0 }
                        )
                    )

                    PartakePrimaryButton(title: "Looks good — start splitting") {
                        let bill = viewModel.createBill(
                            participants: participants,
                            tipPercent: 20,
                            createdBy: createdBy
                        )
                        scannedBill = bill
                        dismiss()
                    }
                    .padding(.horizontal, PartakeTheme.spacingLG)
                    .padding(.bottom, PartakeTheme.spacingMD)
                } else if viewModel.isScanning {
                    Spacer()
                    VStack(spacing: PartakeTheme.spacingMD) {
                        ProgressView()
                            .scaleEffect(1.5)
                        Text("Reading your receipt...")
                            .font(PartakeTheme.body)
                            .foregroundStyle(PartakeTheme.subtleText)
                    }
                    Spacer()
                } else {
                    Spacer()

                    VStack(spacing: PartakeTheme.spacingLG) {
                        Text("📸")
                            .font(.system(size: 60))

                        Text("Snap a pic or pick from your photos")
                            .font(PartakeTheme.headline)
                            .multilineTextAlignment(.center)

                        Text("We'll read the items and prices for you")
                            .font(PartakeTheme.body)
                            .foregroundStyle(PartakeTheme.subtleText)
                    }

                    Spacer()

                    VStack(spacing: PartakeTheme.spacingMD) {
                        PartakePrimaryButton(title: "Take a photo") {
                            showCamera = true
                        }

                        PhotosPicker(selection: $selectedPhoto, matching: .images) {
                            Text("Pick from gallery")
                                .font(PartakeTheme.headline)
                                .foregroundStyle(Color(hex: "FF6B6B"))
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, PartakeTheme.spacingMD)
                                .background(
                                    RoundedRectangle(cornerRadius: PartakeTheme.cornerRadiusFull)
                                        .stroke(Color(hex: "FF6B6B"), lineWidth: 2)
                                )
                        }

                        Button("Or just type it in") {
                            viewModel.parsedReceipt = ParsedReceipt(items: [], tax: nil, subtotal: nil, total: nil)
                        }
                        .font(PartakeTheme.caption)
                        .foregroundStyle(PartakeTheme.subtleText)
                    }
                    .padding(.horizontal, PartakeTheme.spacingLG)
                    .padding(.bottom, PartakeTheme.spacingXL)
                }
            }
            .navigationTitle("Scan receipt")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .sheet(isPresented: $showCamera) {
                DocumentCameraView { image in
                    showCamera = false
                    Task { await viewModel.processImage(image) }
                }
            }
            .onChange(of: selectedPhoto) { _, newItem in
                guard let newItem else { return }
                Task {
                    if let data = try? await newItem.loadTransferable(type: Data.self),
                       let image = UIImage(data: data) {
                        await viewModel.processImage(image)
                    }
                }
            }
            .alert("Hmm", isPresented: .init(
                get: { viewModel.errorMessage != nil },
                set: { if !$0 { viewModel.errorMessage = nil } }
            )) {
                Button("OK") { viewModel.errorMessage = nil }
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
        }
    }
}

struct DocumentCameraView: UIViewControllerRepresentable {
    let onScan: (UIImage) -> Void

    func makeUIViewController(context: Context) -> VNDocumentCameraViewController {
        let controller = VNDocumentCameraViewController()
        controller.delegate = context.coordinator
        return controller
    }

    func updateUIViewController(_ uiViewController: VNDocumentCameraViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onScan: onScan)
    }

    class Coordinator: NSObject, VNDocumentCameraViewControllerDelegate {
        let onScan: (UIImage) -> Void

        init(onScan: @escaping (UIImage) -> Void) {
            self.onScan = onScan
        }

        func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFinishWith scan: VNDocumentCameraScan) {
            if scan.pageCount > 0 {
                onScan(scan.imageOfPage(at: 0))
            }
            controller.dismiss(animated: true)
        }

        func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
            controller.dismiss(animated: true)
        }

        func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFailWithError error: Error) {
            controller.dismiss(animated: true)
        }
    }
}
