// Tenant-scoping helpers. Single-school deployments today still go through
// these, so turning on a second school later means creating a second School
// document and pointing new users at it — no query rewrites required.

// Merge a school filter into a query object: scopeQuery(req, { role: 'student' })
const scopeQuery = (req, filter = {}) => ({ ...filter, school: req.user.school });

// Stamp the logged-in user's school onto a document being created:
// withSchool(req, req.body)
const withSchool = (req, body = {}) => ({ ...body, school: req.user.school });

module.exports = { scopeQuery, withSchool };
