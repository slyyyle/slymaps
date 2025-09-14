#!/bin/bash
 
# Start Cloudflare tunnel for slymaps.io
echo "Starting Cloudflare tunnel for slymaps.io..."
cloudflared tunnel --config /home/slyle/Projects/slymaps/slymaps.yml run cbe4eed9-cedc-426d-943b-330f07c54229