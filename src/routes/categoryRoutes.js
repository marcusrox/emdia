const Category = require("../models/Category");
const { redirect, sendHtml } = require("../services/http");
const {
  categoriesView,
  deletedCategoriesView,
  notFoundView,
} = require("../services/viewEngine");

function registerCategoryRoutes(app, { requireCsrf }) {
  app.get("/categories", (req, res) => {
    return sendHtml(res, categoriesView({ user: req.user, categories: Category.list(req.user.id) }));
  });

  app.get("/categories/deleted", (req, res) => {
    return sendHtml(res, deletedCategoriesView({ user: req.user, categories: Category.listDeleted(req.user.id) }));
  });

  app.get("/categories/:id/edit", (req, res) => {
    const category = Category.getById(req.user.id, req.params.id);
    if (!category) return sendHtml(res, notFoundView(req.user), 404);

    return sendHtml(
      res,
      categoriesView({
        user: req.user,
        categories: Category.list(req.user.id),
        category,
        action: `/categories/${category.id}`,
      })
    );
  });

  app.post("/categories", requireCsrf, (req, res) => {
    Category.create(req.user.id, req.body);
    return redirect(res, "/categories");
  });

  app.post("/categories/:id", requireCsrf, (req, res) => {
    Category.update(req.user.id, req.params.id, req.body);
    return redirect(res, "/categories");
  });

  app.post("/categories/:id/delete", requireCsrf, (req, res) => {
    Category.softDelete(req.user.id, req.params.id);
    return redirect(res, "/categories");
  });

  app.post("/categories/:id/restore", requireCsrf, (req, res) => {
    Category.restore(req.user.id, req.params.id);
    return redirect(res, "/categories/deleted");
  });
}

module.exports = {
  registerCategoryRoutes,
};
