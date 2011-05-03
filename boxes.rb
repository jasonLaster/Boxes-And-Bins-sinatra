# boxes.rb
require 'sinatra'
require 'haml'

get '/' do
  @uid = 1
  @content = "hello world"
  erb :index
end