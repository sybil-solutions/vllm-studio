import Foundation

@MainActor
final class RecipeEditorViewModel: ObservableObject {
  @Published var recipe: Recipe = RecipeDefaults.newRecipe()
  @Published var loading = false
  @Published var error: String?

  private var api: ApiClient?
  private var isNew = true

  func connect(api: ApiClient, recipeId: String?) {
    self.api = api
    isNew = recipeId == nil
    if let id = recipeId { Task { await load(id: id) } }
  }

  func load(id: String) async {
    guard let api else { return }
    loading = true
    defer { loading = false }
    do { recipe = try await api.getRecipe(id: id) }
    catch { self.error = error.localizedDescription }
  }

  func save() async {
    guard let api else { return }
    if isNew { _ = try? await api.createRecipe(recipe) }
    else { _ = try? await api.updateRecipe(recipe) }
  }
}
