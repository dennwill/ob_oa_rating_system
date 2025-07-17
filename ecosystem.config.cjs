module.exports = {
    apps: [
        
        {
            name: "ob-rating-system",
            script: "./node_modules/next/dist/bin/next",
            args: "start -p 3000",
            interpreter: "node",
            env: {
                NODE_ENV: "production"
            }
        }
        
    ]
}