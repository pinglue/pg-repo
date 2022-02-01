
### @get-mongodb-collection
params:
- name: string
- exact?: boolean - if true, the collection name will be as it is, otherwise it'll be namespaced with controllers id (i.e., controller-id/collection-name)

returns the collection with the given name from the main mongodb of the project
