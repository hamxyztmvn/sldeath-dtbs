export default function handler(req, res) {
  res.status(200).json({ 
    status: 'ok', 
    githubTokenExists: !!process.env.GITHUB_TOKEN,
    adminPassExists: !!process.env.ADMIN_PASSWORD
  });
}
