const getCurrentUser = (req, res) => {
  res.json(req.user);
};

module.exports = {
  getCurrentUser
};