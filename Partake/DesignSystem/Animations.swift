import SwiftUI

struct PartakeAnimations {
    /// Spring animation for item claims
    static let claimSpring = Animation.spring(response: 0.35, dampingFraction: 0.6)

    /// Smooth ease for general transitions
    static let smooth = Animation.easeInOut(duration: 0.25)

    /// Bouncy animation for celebrations
    static let celebrate = Animation.spring(response: 0.5, dampingFraction: 0.5)

    /// Gentle slide for suggestion cards
    static let slideIn = Animation.spring(response: 0.4, dampingFraction: 0.8)
}

struct ShakeEffect: GeometryEffect {
    var amount: CGFloat = 5
    var shakesPerUnit = 3
    var animatableData: CGFloat

    func effectValue(size: CGSize) -> ProjectionTransform {
        ProjectionTransform(
            CGAffineTransform(
                translationX: amount * sin(animatableData * .pi * CGFloat(shakesPerUnit)),
                y: 0
            )
        )
    }
}

struct PopEffect: ViewModifier {
    let isActive: Bool

    func body(content: Content) -> some View {
        content
            .scaleEffect(isActive ? 1.15 : 1.0)
            .animation(PartakeAnimations.claimSpring, value: isActive)
    }
}

extension View {
    func popEffect(isActive: Bool) -> some View {
        modifier(PopEffect(isActive: isActive))
    }
}

struct ConfettiPiece: View {
    let color: Color
    @State private var position: CGPoint = .zero
    @State private var opacity: Double = 1
    @State private var rotation: Double = 0

    var body: some View {
        RoundedRectangle(cornerRadius: 2)
            .fill(color)
            .frame(width: 8, height: 8)
            .rotationEffect(.degrees(rotation))
            .position(position)
            .opacity(opacity)
    }
}

struct ConfettiView: View {
    let isActive: Bool

    var body: some View {
        ZStack {
            if isActive {
                ForEach(0..<30, id: \.self) { i in
                    ConfettiParticle(
                        color: PartakeTheme.participantColors[i % PartakeTheme.participantColors.count]
                    )
                }
            }
        }
        .allowsHitTesting(false)
    }
}

struct ConfettiParticle: View {
    let color: Color

    @State private var offsetX: CGFloat = 0
    @State private var offsetY: CGFloat = 0
    @State private var rotation: Double = 0
    @State private var opacity: Double = 1

    var body: some View {
        RoundedRectangle(cornerRadius: 2)
            .fill(color)
            .frame(width: CGFloat.random(in: 6...10), height: CGFloat.random(in: 6...10))
            .offset(x: offsetX, y: offsetY)
            .rotationEffect(.degrees(rotation))
            .opacity(opacity)
            .onAppear {
                withAnimation(.easeOut(duration: Double.random(in: 1.0...2.0))) {
                    offsetX = CGFloat.random(in: -150...150)
                    offsetY = CGFloat.random(in: -300 ... -50)
                    rotation = Double.random(in: 0...720)
                }
                withAnimation(.easeIn(duration: 1.5).delay(0.5)) {
                    opacity = 0
                }
            }
    }
}
