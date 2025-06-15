namespace :assets do
  desc "Skip asset precompilation"
  task :precompile do
    puts "Skipping asset precompilation - using runtime compilation"
  end
end