### Modeling Miniature Devices

A modeling environment for miniature devices based on [WebGME](https://webgme.org/).

### Installation & Running

You need to install:
  * mongo database
  * node and npm
  * TinyOS toolchain
  * Clone the [driver](https://github.com/pillforge/tinyos-drivers) repository to the same parent folder

Once you have the required tools
  * Install dependencies with: `npm install`
  * Run the server with: `npm start`

### Adding a new component
  * Create a new component object in the WebGME project
    * Place the new object in the `Language` node
    * Add it to the `Meta` view
    * Set attributes and relations
  * Run template file generator
    `./src/scripts/create_templates <name>`
  * Implement template files for the component
  * You may need to tweak the generator source code if you're implementing a new class of component
  * Write tests for the new component
