const express = require('express')
const simpleGit = require('simple-git')
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const router = express.Router()
const git = simpleGit()
const middleware = require('../middleware/auth.js')

const User = require('../models/User.js')
const Stories = require('../models/Stories.js')

// const {} = require()

router.get('/dashboard/new-story', function (req, res) {
  res.send('Add a new story!')
})

// Post a story
router.post('/dashboard/new-story', middleware.isLoggedIn, function (req, res) {
  // Save story
  let file_name = new Date()
  file_name = file_name.toISOString().slice(0,10) + '-' + uuidv4()
  let owner_fellow = {
    id: req.user._id
  }
  let newStory = {
    file_name: file_name,
    owner_fellow: owner_fellow
  }
  // Add to user
  User.findById(req.user._id, function (err, user) {
    if(err) {
      console.log(err)
      res.redirect('/')
    } else {
      Stories.create(newStory, async (err, story) => {
        if(err) {
          console.log(err)
        } else {
          story.save()
          user.stories.push(story)
          user.save()
          // Save to stories and push to GitHub
          let title = req.body.title
          let content = req.body.content
          await git.cwd('../FellowStories')
                  // .pull() // pull to update repository before pushing changes
          fs.writeFile(`../FellowStories/stories/${file_name}.md`, `---\ntitle: ${title}\nauthor: ${user.first_name} ${user.last_name}\n---\n${content}\n`, function (err) {
            if (err) throw err
          })
          await git.add('./*')
                  .commit('add: new blog')
                  // .push('origin', 'main') // uncomment once no more changes are left to add to front-end to avoid conflicts
          res.send('Successfully posted story!')
          // res.redirect('/dashboard')
        }
      })
    }
  })
})

// Delete a story
router.delete('/stories/:file_name', middleware.checkStoriesOwnership, function(req, res) {
  Stories.findOneAndDelete({ file_name: req.params.file_name }, function(err, story) {
    if(err) {
      res.redirect('/dashboard')
    } else {
      User.findByIdAndUpdate(story.owner_fellow.id, { $pull: { stories: story._id } }, function (err, user) {
        if(err) {
          console.log(err)
          res.redirect('/')
        } else {
          // res.redirect('/dashboard')
          res.send('Successfully deleted!')
        }
      })
    }
  })
})

module.exports = router
