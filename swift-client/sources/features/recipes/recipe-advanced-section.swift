import SwiftUI

struct RecipeAdvancedSection: View {
  @Binding var recipe: Recipe
  @Binding var envText: String
  @Binding var extraText: String

  var body: some View {
    Section("Advanced") {
      TextField("KV Cache Dtype", text: $recipe.kvCacheDtype)
      TextField("Quantization", text: Binding($recipe.quantization, ""))
      TextField("DType", text: Binding($recipe.dtype, ""))
      Slider(value: $recipe.gpuMemoryUtilization, in: 0.1...1.0)
      Text("GPU Memory Utilization: \(String(format: "%.2f", recipe.gpuMemoryUtilization))")
      Toggle("Auto Tool Choice", isOn: $recipe.enableAutoToolChoice)
      TextField("Thinking Mode", text: $recipe.thinkingMode)
      Stepper("Max Thinking: \(recipe.maxThinkingTokens ?? 0)", value: Binding(
        get: { recipe.maxThinkingTokens ?? 0 },
        set: { recipe.maxThinkingTokens = $0 }
      ), in: 0...8192)
      TextField("Env Vars JSON", text: $envText)
      TextField("Extra Args JSON", text: $extraText)
    }
  }
}
