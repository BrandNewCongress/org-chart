const fs = require('fs')

const Airtable = require('airtable')
const airtable = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
})

const base = airtable.base('appJTrYsUJR9ZEYJt')

const getAll = table => new Promise((resolve, reject) => {
  let results = []

  base(table).select().eachPage((records, fetchNext) => {
    records.forEach(r => results.push(Object.assign(r.fields, {id: r._rawJson.id})))
    console.log(`Cached ${table} has ${results.length}`)
    fetchNext()
  }, err => err
    ? reject(err)
    : resolve(results)
  )
})

Promise.all(['Groups', 'Teams', 'Squads', 'People'].map(t => getAll(t)))
.then(([groups, teams, squads, people]) => {
  fs.writeFileSync('./groups.json', JSON.stringify(groups))
  fs.writeFileSync('./teams.json', JSON.stringify(teams))
  fs.writeFileSync('./squads.json', JSON.stringify(people))
  fs.writeFileSync('./people.json', JSON.stringify(squads))

  const data = {}
  const root = {
    name: 'BNC',
    children: []
  }

  const squadLU = {}
  const teamLU = {}
  const peopleLU = {}

  people.forEach(p => {
    console.log(p.Name)
    peopleLU[p.id] = {name: p.Name}
  })

  squads.forEach(s => {
    squadLU[s.id] = {name: s.Name}

    if (s.People)
      squadLU[s.id].children = s.People.map(p => peopleLU[p])
  })

  teams.forEach(t => {
    teamLU[t.id] = {
      name: t.Name
    }

    if (t.Squads)
      teamLU[t.id].children = t.Squads.map(s => squadLU[s])
  })

  groups.forEach(g => {
    root.children.push({
      name: g.Name,
      children: g.Teams.map(t => teamLU[t])
    })
  })

  fs.writeFileSync('./root.json', JSON.stringify(root))

  console.log('Done')
})
.catch(console.log)
