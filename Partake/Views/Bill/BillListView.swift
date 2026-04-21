import SwiftUI

struct BillListView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var bills: [Bill] = []
    @State private var showNewBill = false
    @State private var newBill: Bill?
    @State private var searchText = ""

    private let billRepository = BillRepository()

    var filteredBills: [Bill] {
        if searchText.isEmpty { return bills }
        return bills.filter {
            ($0.name.localizedCaseInsensitiveContains(searchText)) ||
            ($0.restaurantName?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if bills.isEmpty {
                    emptyState
                } else {
                    billList
                }
            }
            .navigationTitle("Bills")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showNewBill = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                            .foregroundStyle(PartakeTheme.primaryGradient)
                    }
                }
            }
            .sheet(isPresented: $showNewBill) {
                NewBillFlow(createdBy: authViewModel.currentUser?.id ?? "")
            }
            .task {
                await loadBills()
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: PartakeTheme.spacingMD) {
            Spacer()

            Text("🍕")
                .font(.system(size: 60))

            Text("No bills yet")
                .font(PartakeTheme.title)

            Text("Go eat something")
                .font(PartakeTheme.body)
                .foregroundStyle(PartakeTheme.subtleText)

            PartakePrimaryButton(title: "Split a bill") {
                showNewBill = true
            }
            .padding(.horizontal, 60)
            .padding(.top, PartakeTheme.spacingMD)

            Spacer()
            Spacer()
        }
    }

    private var billList: some View {
        List {
            ForEach(filteredBills) { bill in
                NavigationLink {
                    BillSplitView(viewModel: BillViewModel(bill: bill))
                } label: {
                    BillRow(bill: bill)
                }
            }
        }
        .listStyle(.insetGrouped)
        .searchable(text: $searchText, prompt: "Search bills")
    }

    private func loadBills() async {
        guard let userId = authViewModel.currentUser?.id else { return }
        bills = (try? await billRepository.getBills(for: userId)) ?? []
    }
}

struct BillRow: View {
    let bill: Bill

    var body: some View {
        HStack(spacing: PartakeTheme.spacingMD) {
            ZStack {
                RoundedRectangle(cornerRadius: PartakeTheme.cornerRadiusSM)
                    .fill(PartakeTheme.primaryGradient)
                    .frame(width: 44, height: 44)
                Text("🧾")
                    .font(.title3)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(bill.name.isEmpty ? "Untitled bill" : bill.name)
                    .font(PartakeTheme.headline)

                HStack(spacing: PartakeTheme.spacingXS) {
                    Text(bill.createdAt, style: .date)
                    if let restaurant = bill.restaurantName {
                        Text("·")
                        Text(restaurant)
                    }
                }
                .font(PartakeTheme.caption)
                .foregroundStyle(PartakeTheme.subtleText)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text("$\(bill.total, specifier: "%.2f")")
                    .font(PartakeTheme.body.weight(.semibold))

                Text(bill.status == .settled ? "Settled ✓" : "Open")
                    .font(PartakeTheme.caption)
                    .foregroundStyle(bill.status == .settled ? Color(hex: "4ECDC4") : .orange)
            }
        }
        .padding(.vertical, PartakeTheme.spacingXS)
    }
}
