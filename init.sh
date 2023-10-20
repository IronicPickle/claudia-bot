if [ ! -e .env ]; then
  echo "> Generating .env file"
  echo "DENO_ENV=development" >> .env
  echo "" >> .env
  echo "DISCORD_TOKEN=" >> .env
  echo "DISCORD_BOT_ID=" >> .env
  echo "" >> .env
  echo "AUTH_SECRET=keyboard_cat" >> .env
else
  echo "> .env already exists, skipping..."
fi