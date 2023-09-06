//  High-level github automation API.


const path = require('path')
const fs = require('fs')

const GitHubApi = require('github')
const P = require('bluebird')


function GH(options) {

  options = options || {}
  this._gh = P.promisifyAll(new GitHubApi({
    version: '3.0.0',
    host: options.host || 'api.github.com',
    debug: options.debug,
    timeout: options.timeout || 3000,
  }))

  var env = process.env
  var api_key = options.api_key || env.GITHUB_API_KEY
  if (api_key) {
    var username = options.username || env.GITHUB_USERNAME || env.USER
    this._gh.authenticate({
      type: 'basic',
      username: username,
      password: api_key
    })
  }

  // Expose the 'issues' API with promisified semantics, and with
  // a wrapper to fetch all result pages at once.
  var self = this
  this.issues = {}
  Object.keys(this._gh.issues).forEach(function(methodName) {
    if (typeof self._gh.issues[methodName] === 'function') {
      self.issues[methodName] = function(msg) {
        msg.user = msg.user || 'mozilla'
        msg.per_page = msg.per_page || 50
        return new P(function(resolve, reject) {
          self._gh.issues[methodName](msg, function(err, res) {
            if (err) return reject(err)
            resolve(self._getAllPages(res))
          })
        })
      }
    }
  })
}

GH.prototype._getAllPages = function _getAllPages(curPage, acc) {
  var self = this
  acc = acc || []
  acc = acc.concat(curPage)
  if (!this._gh.hasNextPage(curPage)) {
    return P.resolve(acc)
  }
  return self._gh.getNextPageAsync(curPage).then(function (nextPage) {
    return self._getAllPages(nextPage, acc)
  })
}

module.exports = GH
