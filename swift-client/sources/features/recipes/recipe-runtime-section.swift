import SwiftUI

struct RecipeRuntimeSection: View {
  @Binding var recipe: Recipe

  var body: some View {
    Section("Runtime") {
      TextField("Host", text: $recipe.host)
      Stepper("Port: \(recipe.port)", value: $recipe.port, in: 1...65535)
      Stepper("Tensor Parallel: \(recipe.tensorParallelSize)", value: $recipe.tensorParallelSize, in: 1...16)
      Stepper("Pipeline Parallel: \(recipe.pipelineParallelSize)", value: $recipe.pipelineParallelSize, in: 1...16)
      Stepper("Max Model Len: \(recipe.maxModelLen)", value: $recipe.maxModelLen, in: 256...131072)
      Stepper("Max Seqs: \(recipe.maxNumSeqs)", value: $recipe.maxNumSeqs, in: 1...1024)
      Toggle("Trust Remote Code", isOn: $recipe.trustRemoteCode)
    }
  }
}
