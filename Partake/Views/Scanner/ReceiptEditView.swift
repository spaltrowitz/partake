import SwiftUI

struct ReceiptEditView: View {
    @Binding var receipt: ParsedReceipt
    @State private var newItemName = ""
    @State private var newItemPrice = ""
    @State private var editingIndex: Int?

    var body: some View {
        List {
            // Restaurant name
            if let name = receipt.restaurantName {
                Section {
                    HStack {
                        Text("📍")
                        Text(name)
                            .font(PartakeTheme.headline)
                    }
                }
            }

            // Items
            Section("Items") {
                ForEach(Array(receipt.items.enumerated()), id: \.element.id) { index, item in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.name)
                                .font(PartakeTheme.body)
                            if item.isLowConfidence {
                                Text("Might not be right — double check")
                                    .font(PartakeTheme.caption)
                                    .foregroundStyle(.orange)
                            }
                        }

                        Spacer()

                        Text("$\(item.price, specifier: "%.2f")")
                            .font(PartakeTheme.price)
                    }
                    .listRowBackground(item.isLowConfidence ? Color.orange.opacity(0.08) : nil)
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) {
                            receipt.items.remove(at: index)
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                    .contentShape(Rectangle())
                    .onTapGesture {
                        editingIndex = index
                    }
                }

                // Add new item
                HStack {
                    TextField("Item name", text: $newItemName)
                        .font(PartakeTheme.body)

                    TextField("0.00", text: $newItemPrice)
                        .font(PartakeTheme.body)
                        .keyboardType(.decimalPad)
                        .frame(width: 80)
                        .multilineTextAlignment(.trailing)

                    Button {
                        addItem()
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .foregroundStyle(Color(hex: "FF6B6B"))
                            .font(.title3)
                    }
                    .disabled(newItemName.isEmpty || newItemPrice.isEmpty)
                }
            }

            // Tax & Total
            Section("Tax & Total") {
                HStack {
                    Text("Tax")
                        .font(PartakeTheme.body)
                    Spacer()
                    Text("$\(receipt.tax ?? 0, specifier: "%.2f")")
                        .font(PartakeTheme.body)
                }

                if let subtotal = receipt.subtotal {
                    HStack {
                        Text("Subtotal")
                            .font(PartakeTheme.body)
                        Spacer()
                        Text("$\(subtotal, specifier: "%.2f")")
                            .font(PartakeTheme.body)
                    }
                }

                if let total = receipt.total {
                    HStack {
                        Text("Total")
                            .font(PartakeTheme.headline)
                        Spacer()
                        Text("$\(total, specifier: "%.2f")")
                            .font(PartakeTheme.price)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .sheet(item: $editingIndex) { index in
            EditItemSheet(
                name: receipt.items[index].name,
                price: receipt.items[index].price
            ) { name, price in
                receipt.items[index] = ParsedItem(
                    name: name,
                    price: price,
                    confidence: 1.0,
                    quantity: receipt.items[index].quantity
                )
                editingIndex = nil
            }
        }
    }

    private func addItem() {
        guard !newItemName.isEmpty,
              let price = Double(newItemPrice) else { return }
        receipt.items.append(ParsedItem(name: newItemName, price: price))
        newItemName = ""
        newItemPrice = ""
    }
}

extension Int: @retroactive Identifiable {
    public var id: Int { self }
}

struct EditItemSheet: View {
    @State var name: String
    @State var price: Double
    @Environment(\.dismiss) private var dismiss
    let onSave: (String, Double) -> Void

    @State private var priceString: String = ""

    init(name: String, price: Double, onSave: @escaping (String, Double) -> Void) {
        _name = State(initialValue: name)
        _price = State(initialValue: price)
        _priceString = State(initialValue: String(format: "%.2f", price))
        self.onSave = onSave
    }

    var body: some View {
        NavigationStack {
            Form {
                TextField("Item name", text: $name)
                    .font(PartakeTheme.body)

                HStack {
                    Text("$")
                    TextField("Price", text: $priceString)
                        .keyboardType(.decimalPad)
                }
                .font(PartakeTheme.body)
            }
            .navigationTitle("Edit item")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        if let p = Double(priceString) {
                            onSave(name, p)
                        }
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }
}
