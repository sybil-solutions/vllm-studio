import Foundation

@MainActor
final class RecipesViewModel: ObservableObject {
  @Published var recipes: [RecipeWithStatus] = []
  @Published var loading = false
  @Published var error: String?

  private var api: ApiClient?

  func connect(api: ApiClient) {
    if self.api == nil { self.api = api }
    Task { await load() }
  }

  func load() async {
    guard let api else { return }
    loading = true
    defer { loading = false }
    do { recipes = try await api.getRecipes() }
    catch { self.error = error.localizedDescription }
  }

  func delete(id: String) async {
    guard let api else { return }
    _ = try? await api.deleteRecipe(id: id)
    await load()
  }

  func launch(id: String) async { _ = try? await api?.launchRecipe(id: id) }
}
