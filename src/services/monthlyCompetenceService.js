const User = require("../models/User");
const { currentCompetence, isCompetence } = require("./dateService");

function resolveMonthlyCompetence(user, requestedCompetence) {
  if (isCompetence(requestedCompetence)) {
    User.updateLastCompetence(user.id, requestedCompetence);
    return requestedCompetence;
  }

  const persistedCompetence = User.getLastCompetence(user.id);
  return isCompetence(persistedCompetence)
    ? persistedCompetence
    : currentCompetence(user.timezone);
}

module.exports = {
  resolveMonthlyCompetence,
};
