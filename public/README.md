# DVF - Solution Immobilière***

### Author
TehLurdUfEngmer

## Description
This application was designed to run hard statistical and data analysis on DVF from France open data files

## Data Sources
opendata.gouv.fr

## Git Help
** check Git version : **
git --version

** set user name and email **
git config --global user.name "-name-"
git config --global user.email "-mail-"

** initialize Git project **
cd pathToTheProjectToInitalize
git init

** check if there is modifications to commit **
git status

** add or update a file to Git Project **
git add subPath/file.txt

** commit changes **
git commit -m "description of changes"

** get historics of past commits: **
git log

# create a git branch (project copy for working)
git branch branchname

# list the branchs running
git branch

# changing branch work
git checkout branchname

# merge work branch to master branch
git checkout master
git merge branchname

# delete a branch
git branch -d branchname

# pipe gitHub repository to git local
git remote add origin https://github.com/tehLurdUfEngmer/DVFAnalytics.git

# deposit project to gitHub
git push origin master

# pull from gitHub to branch master
git pull origin master
