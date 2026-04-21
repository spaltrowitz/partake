import SwiftUI

struct PartakeCard<Content: View>: View {
    let content: () -> Content

    init(@ViewBuilder content: @escaping () -> Content) {
        self.content = content
    }

    var body: some View {
        content()
            .padding(PartakeTheme.spacingMD)
            .background(PartakeTheme.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: PartakeTheme.cornerRadiusMD))
            .shadow(color: .black.opacity(0.08), radius: 8, x: 0, y: 4)
    }
}

struct PartakePrimaryButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(PartakeTheme.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, PartakeTheme.spacingMD)
                .background(PartakeTheme.primaryGradient)
                .clipShape(RoundedRectangle(cornerRadius: PartakeTheme.cornerRadiusFull))
        }
    }
}

struct PartakeSecondaryButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(PartakeTheme.headline)
                .foregroundStyle(Color(hex: "FF6B6B"))
                .frame(maxWidth: .infinity)
                .padding(.vertical, PartakeTheme.spacingMD)
                .background(
                    RoundedRectangle(cornerRadius: PartakeTheme.cornerRadiusFull)
                        .stroke(Color(hex: "FF6B6B"), lineWidth: 2)
                )
        }
    }
}

struct AvatarView: View {
    let name: String
    let colorIndex: Int
    var size: CGFloat = 44

    var initials: String {
        let parts = name.split(separator: " ")
        if parts.count >= 2 {
            return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }

    var body: some View {
        ZStack {
            Circle()
                .fill(PartakeTheme.colorForParticipant(at: colorIndex))
            Text(initials)
                .font(.system(size: size * 0.38, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
        }
        .frame(width: size, height: size)
    }
}

struct SuggestionCard: View {
    let message: String
    let onAccept: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        HStack(spacing: PartakeTheme.spacingSM) {
            Text("💡")
                .font(.title3)

            Text(message)
                .font(PartakeTheme.body)
                .foregroundStyle(.primary)

            Spacer()

            Button(action: onAccept) {
                Text("Sure")
                    .font(PartakeTheme.caption.weight(.semibold))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(PartakeTheme.primaryGradient)
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
            }

            Button(action: onDismiss) {
                Image(systemName: "xmark")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(PartakeTheme.subtleText)
            }
        }
        .padding(PartakeTheme.spacingMD)
        .background(Color(hex: "FFF5F0"))
        .clipShape(RoundedRectangle(cornerRadius: PartakeTheme.cornerRadiusMD))
    }
}
