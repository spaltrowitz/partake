import SwiftUI

struct MainTabView: View {
    @State private var selectedTab: Tab = .bills

    enum Tab: String {
        case bills, profile
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            BillListView()
                .tabItem {
                    Label("Bills", systemImage: "receipt")
                }
                .tag(Tab.bills)

            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.circle")
                }
                .tag(Tab.profile)
        }
        .tint(PartakeTheme.accentColor)
    }
}
