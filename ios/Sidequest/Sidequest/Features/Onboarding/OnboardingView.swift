import SwiftUI

struct OnboardingView: View {
    @Environment(ExplorerViewModel.self) private var vm
    @Environment(\.dismiss) private var dismiss

    @State private var step: Step = .city
    @State private var draft = Draft()
    @State private var showConfetti = false

    enum Step: Int, CaseIterable {
        case city, budget, diet, activities, accessibility, celebrate
        var progress: Double { Double(rawValue + 1) / Double(Step.allCases.count) }
    }

    var body: some View {
        ZStack {
            GlowBackground(animated: false)
                .overlay(Theme.background.opacity(0.55).ignoresSafeArea())

            VStack(spacing: 0) {
                header
                ScrollView {
                    content
                        .padding(.horizontal, Space.xxl)
                        .padding(.top, Space.xl)
                        .padding(.bottom, 140)
                        .id(step)
                        .transition(.asymmetric(
                            insertion: .move(edge: .trailing).combined(with: .opacity),
                            removal: .move(edge: .leading).combined(with: .opacity)
                        ))
                }
            }

            VStack { Spacer(); footer }

            if showConfetti {
                ConfettiView(isActive: showConfetti)
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .presentationBackground(.clear)
        .interactiveDismissDisabled(!vm.profile.onboardingComplete)
        .onAppear(perform: seedDraft)
    }

    // MARK: - Header

    private var header: some View {
        VStack(spacing: Space.md) {
            Capsule()
                .fill(Theme.border)
                .frame(width: 40, height: 5)
                .padding(.top, Space.sm)

            HStack {
                if step != .city && step != .celebrate {
                    Button {
                        back()
                    } label: {
                        Image(systemName: "chevron.left").font(.sqHeadline)
                    }
                    .foregroundStyle(Theme.textMuted)
                }
                Spacer()
                if vm.profile.onboardingComplete {
                    Button("Close") { dismiss() }
                        .font(.sqCallout)
                        .foregroundStyle(Theme.textMuted)
                }
            }
            .frame(height: 24)
            .padding(.horizontal, Space.xxl)

            ProgressBar(progress: step.progress)
                .padding(.horizontal, Space.xxl)
        }
    }

    private var footer: some View {
        VStack(spacing: Space.sm) {
            Button(action: advance) {
                Text(primaryTitle)
            }
            .buttonStyle(.sqPrimary)
            .disabled(!canAdvance)
            .opacity(canAdvance ? 1 : 0.5)

            if step == .accessibility {
                Button("Skip for now") { advance() }
                    .font(.sqCaption)
                    .foregroundStyle(Theme.textMuted)
            }
        }
        .padding(.horizontal, Space.xxl)
        .padding(.bottom, Space.xxl)
        .padding(.top, Space.md)
        .background(
            LinearGradient(colors: [Theme.background.opacity(0), Theme.background], startPoint: .top, endPoint: .bottom)
                .ignoresSafeArea()
        )
    }

    // MARK: - Content per step

    @ViewBuilder private var content: some View {
        switch step {
        case .city:
            StepShell(emoji: "🌍", title: "Where's home base?", subtitle: "We'll find events happening near you this weekend.") {
                TextField("Your city", text: $draft.homeCity)
                    .textInputAutocapitalization(.words)
                    .autocorrectionDisabled()
                    .font(.sqHeadline)
                    .foregroundStyle(Theme.textPrimary)
                    .padding(Space.lg)
                    .sqGlassCard(cornerRadius: Radius.lg)
            }
        case .budget:
            StepShell(emoji: "💸", title: "What's the vibe on budget?", subtitle: "Per activity — we'll keep suggestions in range.") {
                VStack(spacing: Space.md) {
                    ForEach(BudgetTier.allCases) { tier in
                        BudgetCard(tier: tier, isSelected: draft.budget == tier.value) {
                            draft.budget = tier.value
                            Haptics.tap()
                        }
                    }
                }
            }
        case .diet:
            StepShell(emoji: "🥗", title: "Any food preferences?", subtitle: "Pick any that apply, or skip.") {
                chipCloud(options: DietOption.all, selection: $draft.diet)
            }
        case .activities:
            StepShell(emoji: "🎉", title: "What are you into?", subtitle: "Choose a few interests to steer your quest.") {
                chipCloud(options: ActivityOption.all, selection: $draft.activities)
            }
        case .accessibility:
            StepShell(emoji: "♿️", title: "Accessibility needs?", subtitle: "Optional — helps us verify venues fit you.") {
                chipCloud(options: AccessOption.all, selection: $draft.accessibility)
            }
        case .celebrate:
            CelebrationStep(city: draft.homeCity)
        }
    }

    private func chipCloud(options: [String], selection: Binding<Set<String>>) -> some View {
        FlowLayout(spacing: 10, rowSpacing: 10) {
            ForEach(options, id: \.self) { option in
                SelectChip(title: option, isSelected: selection.wrappedValue.contains(option)) {
                    if selection.wrappedValue.contains(option) {
                        selection.wrappedValue.remove(option)
                    } else {
                        selection.wrappedValue.insert(option)
                    }
                    Haptics.tap()
                }
            }
        }
    }

    // MARK: - Flow

    private var primaryTitle: String {
        switch step {
        case .accessibility: return draft.accessibility.isEmpty ? "Continue" : "Continue"
        case .celebrate: return "Start exploring"
        default: return "Continue"
        }
    }

    private var canAdvance: Bool {
        switch step {
        case .city: return !draft.homeCity.trimmingCharacters(in: .whitespaces).isEmpty
        case .budget: return draft.budget != nil
        default: return true
        }
    }

    private func advance() {
        Haptics.tap()
        if step == .celebrate {
            finish()
            return
        }
        if let next = Step(rawValue: step.rawValue + 1) {
            withAnimation(.spring(response: 0.45, dampingFraction: 0.85)) { step = next }
            if next == .celebrate {
                showConfetti = true
                Haptics.success()
            }
        }
    }

    private func back() {
        if let prev = Step(rawValue: step.rawValue - 1) {
            withAnimation(.spring(response: 0.45, dampingFraction: 0.85)) { step = prev }
        }
    }

    private func finish() {
        let profile = UserProfile(
            homeCity: draft.homeCity.trimmingCharacters(in: .whitespaces),
            budget: draft.budget,
            diet: draft.diet.sorted().joined(separator: ", ").lowercased(),
            activities: draft.activities.sorted().joined(separator: ", ").lowercased(),
            accessibility: draft.accessibility.isEmpty ? nil : draft.accessibility.sorted().joined(separator: ", ").lowercased(),
            onboardingComplete: true,
            updatedAt: nil
        )
        Task { await vm.saveProfile(profile) }
        dismiss()
    }

    private func seedDraft() {
        guard !vm.profile.homeCity.isEmpty || vm.profile.onboardingComplete else { return }
        draft.homeCity = vm.profile.homeCity
        draft.budget = vm.profile.budget
        draft.diet = tokens(vm.profile.diet, options: DietOption.all)
        draft.activities = tokens(vm.profile.activities, options: ActivityOption.all)
        draft.accessibility = tokens(vm.profile.accessibility ?? "", options: AccessOption.all)
    }

    private func tokens(_ raw: String, options: [String]) -> Set<String> {
        let lowered = raw.lowercased()
        return Set(options.filter { lowered.contains($0.lowercased()) })
    }

    struct Draft {
        var homeCity = ""
        var budget: Double?
        var diet: Set<String> = []
        var activities: Set<String> = []
        var accessibility: Set<String> = []
    }
}

// MARK: - Building blocks

private struct StepShell<Content: View>: View {
    let emoji: String
    let title: String
    let subtitle: String
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: Space.xl) {
            VStack(alignment: .leading, spacing: Space.sm) {
                Text(emoji).font(.system(size: 44))
                Text(title)
                    .font(.system(size: 28, weight: .bold))
                    .foregroundStyle(Theme.textPrimary)
                Text(subtitle)
                    .font(.sqBody)
                    .foregroundStyle(Theme.textMuted)
            }
            content()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct ProgressBar: View {
    let progress: Double
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Theme.border)
                Capsule()
                    .fill(Theme.progressGradient)
                    .frame(width: max(8, geo.size.width * progress))
            }
        }
        .frame(height: 6)
        .animation(.spring(response: 0.5, dampingFraction: 0.8), value: progress)
    }
}

private struct BudgetCard: View {
    let tier: BudgetTier
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Space.lg) {
                Text(tier.symbol)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(isSelected ? Theme.purpleBright : Theme.textMuted)
                VStack(alignment: .leading, spacing: 2) {
                    Text(tier.title).font(.sqHeadline).foregroundStyle(Theme.textPrimary)
                    Text(tier.subtitle).font(.sqCaption).foregroundStyle(Theme.textMuted)
                }
                Spacer()
                if isSelected {
                    Image(systemName: "checkmark.circle.fill").foregroundStyle(Theme.teal)
                }
            }
            .padding(Space.lg)
            .sqGlassCard(cornerRadius: Radius.lg, tint: isSelected ? Theme.purple : nil)
        }
        .buttonStyle(.plain)
    }
}

private struct CelebrationStep: View {
    let city: String
    var body: some View {
        VStack(spacing: Space.lg) {
            Text("🎉").font(.system(size: 64))
            Text("You're all set!")
                .font(.system(size: 30, weight: .bold))
                .foregroundStyle(Theme.textPrimary)
            Text("Let's find your next adventure in \(city.isEmpty ? "your city" : city).")
                .font(.sqBody)
                .foregroundStyle(Theme.textMuted)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, Space.xxxl)
    }
}

// MARK: - Options

enum BudgetTier: String, CaseIterable, Identifiable {
    case low, mid, high, yolo
    var id: String { rawValue }
    var value: Double {
        switch self {
        case .low: 50
        case .mid: 150
        case .high: 300
        case .yolo: 1000
        }
    }
    var symbol: String {
        switch self {
        case .low: "$"
        case .mid: "$$"
        case .high: "$$$"
        case .yolo: "∞"
        }
    }
    var title: String {
        switch self {
        case .low: "Keep it low-key"
        case .mid: "Comfortable"
        case .high: "Treat myself"
        case .yolo: "Money's no object"
        }
    }
    var subtitle: String {
        switch self {
        case .low: "Up to ~$50 per activity"
        case .mid: "Up to ~$150 per activity"
        case .high: "Up to ~$300 per activity"
        case .yolo: "Show me everything"
        }
    }
}

enum DietOption { static let all = ["Vegan", "Vegetarian", "Halal", "Kosher", "Gluten-free", "No preference"] }
enum ActivityOption { static let all = ["Live music", "Food & drink", "Outdoors", "Art & culture", "Nightlife", "Family-friendly", "Tech meetups", "Markets", "Sports"] }
enum AccessOption { static let all = ["Wheelchair", "Step-free", "Quiet spaces", "Assistance animals"] }
