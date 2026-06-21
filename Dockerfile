FROM oven/bun:1-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
# Wildcard ensures package.json AND bun.lock are both copied
COPY package.json bun.lock ./

# Install only production dependencies
RUN bun install --frozen-lockfile --production

# Bundle app source
COPY . .

# Start the bot
CMD [ "bun", "run", "start" ]
