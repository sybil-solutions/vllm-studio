import SwiftUI

struct RecipeBasicSection: View {
  @Binding var recipe: Recipe

  var body: some View {
    Section("Basics") {
      TextField("ID", text: $recipe.id)
      TextField("Name", text: $recipe.name)
      TextField("Model Path", text: $recipe.modelPath)
      TextField("Backend", text: $recipe.backend)
      TextField("Served Model Name", text: Binding($recipe.servedModelName, ""))
    }
  }
}
