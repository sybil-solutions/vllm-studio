import SwiftUI

struct RecipeEditorView: View {
  let recipeId: String?
  @EnvironmentObject private var container: AppContainer
  @StateObject private var model = RecipeEditorViewModel()
  @State private var envText = "{}"
  @State private var extraText = "{}"

  var body: some View {
    Form {
      RecipeBasicSection(recipe: $model.recipe)
      RecipeRuntimeSection(recipe: $model.recipe)
      RecipeAdvancedSection(recipe: $model.recipe, envText: $envText, extraText: $extraText)
    }
    .navigationTitle(recipeId == nil ? "New Recipe" : "Edit Recipe")
    .toolbar { Button("Save") { Task { await save() } } }
    .onAppear { model.connect(api: container.api, recipeId: recipeId); syncJson() }
    .onChange(of: model.recipe.id) { _ in syncJson() }
  }

  private func syncJson() {
    envText = encodeJson(model.recipe.envVars ?? [:])
    extraText = encodeJson(model.recipe.extraArgs)
  }

  private func save() async {
    model.recipe.envVars = decodeJson(envText)
    model.recipe.extraArgs = decodeAnyJson(extraText)
    await model.save()
  }
}
