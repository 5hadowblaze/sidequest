import SwiftUI

struct OnboardingView: View {
    let initialProfile: UserProfile?
    let onComplete: (UserProfile) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var homeCity = ""
    @State private var budgetText = "150"
    @State private var diet = ""
    @State private var activities = ""
    @State private var accessibility = ""
    @State private var validationError: String?

    private static let activityChips = [
        "Live music",
        "Food & drink",
        "Outdoors",
        "Art & culture",
        "Nightlife",
        "Family-friendly",
        "Tech meetups",
        "Markets",
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    headerSection
                    formSection

                    if let validationError {
                        errorBanner(validationError)
                    }

                    Button(action: submit) {
                        Text("Start exploring")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(BrandTheme.accent)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("onboardingSubmitButton")
                }
                .padding(24)
            }
            .background(.white)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(BrandTheme.muted)
                }
            }
        }
        .onAppear { applyInitialValues() }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("ONE-TIME SETUP")
                .font(.caption.weight(.semibold))
                .foregroundStyle(BrandTheme.accent)
                .tracking(1.2)

            Text("Tell us about your weekends")
                .font(.title2.weight(.medium))
                .foregroundStyle(BrandTheme.textPrimary)

            Text(
                "We'll personalize local events and build plans around your preferences — no big form on every visit."
            )
            .font(.subheadline)
            .foregroundStyle(BrandTheme.muted)
            .lineSpacing(3)
        }
        .padding(.bottom, 4)
    }

    private var formSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            formField(title: "Home city") {
                TextField("Austin, TX", text: $homeCity)
                    .textFieldStyle(OnboardingTextFieldStyle())
                    .textContentType(.addressCity)
                    .accessibilityIdentifier("onboardingHomeCity")
            }

            formField(title: "Weekend budget (USD)") {
                TextField("150", text: $budgetText)
                    .textFieldStyle(OnboardingTextFieldStyle())
                    .keyboardType(.numberPad)
                    .accessibilityIdentifier("onboardingBudget")
            }

            formField(title: "Diet & food preferences") {
                TextField("Vegan, nut-free, halal…", text: $diet)
                    .textFieldStyle(OnboardingTextFieldStyle())
                    .accessibilityIdentifier("onboardingDiet")
            }

            formField(title: "What are you into?") {
                FlowLayout(spacing: 8) {
                    ForEach(Self.activityChips, id: \.self) { chip in
                        chipButton(chip)
                    }
                }

                TextField("Or type custom interests…", text: $activities)
                    .textFieldStyle(OnboardingTextFieldStyle())
                    .padding(.top, 4)
                    .accessibilityIdentifier("onboardingActivities")
            }

            formField(title: "Accessibility (optional)") {
                TextField("Wheelchair accessible venues…", text: $accessibility)
                    .textFieldStyle(OnboardingTextFieldStyle())
                    .accessibilityIdentifier("onboardingAccessibility")
            }
        }
    }

    private func formField<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(BrandTheme.textSecondary)
            content()
        }
    }

    private func chipButton(_ chip: String) -> some View {
        let active = selectedChips.contains(chip)

        return Button {
            toggleChip(chip)
        } label: {
            Text(chip)
                .font(.caption.weight(.medium))
                .foregroundStyle(active ? .white : BrandTheme.textSecondary)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(active ? BrandTheme.accent : BrandTheme.surface)
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private func errorBanner(_ message: String) -> some View {
        Text(message)
            .font(.subheadline)
            .foregroundStyle(BrandTheme.error)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(Color(hex: "#fce8e6"))
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var selectedChips: [String] {
        activities
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
    }

    private func toggleChip(_ chip: String) {
        var parts = selectedChips
        if parts.contains(chip) {
            parts.removeAll { $0 == chip }
        } else {
            parts.append(chip)
        }
        activities = parts.joined(separator: ", ")
    }

    private func applyInitialValues() {
        guard let initialProfile else { return }
        homeCity = initialProfile.homeCity
        budgetText = String(format: "%.0f", initialProfile.budget)
        diet = initialProfile.diet
        activities = initialProfile.activities
        accessibility = initialProfile.accessibility ?? ""
    }

    private func submit() {
        validationError = nil

        let trimmedCity = homeCity.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedCity.isEmpty else {
            validationError = "Home city is required."
            return
        }

        guard let budget = Double(budgetText), budget > 0 else {
            validationError = "Enter a valid weekend budget."
            return
        }

        let trimmedDiet = diet.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedDiet.isEmpty else {
            validationError = "Diet preferences help us filter restaurants."
            return
        }

        let trimmedActivities = activities.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedActivities.isEmpty else {
            validationError = "Pick at least one activity interest."
            return
        }

        let trimmedAccessibility = accessibility.trimmingCharacters(in: .whitespacesAndNewlines)

        let profile = UserProfile(
            homeCity: trimmedCity,
            budget: budget,
            diet: trimmedDiet,
            activities: trimmedActivities,
            accessibility: trimmedAccessibility.isEmpty ? nil : trimmedAccessibility,
            onboardingComplete: true,
            updatedAt: ISO8601DateFormatter().string(from: Date())
        )

        onComplete(profile)
        dismiss()
    }
}

private struct OnboardingTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .font(.subheadline)
            .foregroundStyle(BrandTheme.textPrimary)
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(BrandTheme.borderLight, lineWidth: 1)
            )
    }
}

private struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        arrange(proposal: proposal, subviews: subviews).size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, frame) in result.frames.enumerated() {
            subviews[index].place(
                at: CGPoint(x: bounds.minX + frame.minX, y: bounds.minY + frame.minY),
                proposal: ProposedViewSize(frame.size)
            )
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, frames: [CGRect]) {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var frames: [CGRect] = []

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x > 0, x + size.width > maxWidth {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            frames.append(CGRect(origin: CGPoint(x: x, y: y), size: size))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
        }

        return (CGSize(width: maxWidth, height: y + rowHeight), frames)
    }
}

#Preview {
    OnboardingView(initialProfile: nil) { _ in }
}
