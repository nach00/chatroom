#!/usr/bin/env bash
# exit on error
set -o errexit

bundle install
# Skip asset precompilation for now
echo "Skipping asset precompilation due to Node.js compatibility issues"
bundle exec rake db:migrate
