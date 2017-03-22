Unit Testing with Jasmine, Ti.Unit and Istanbul

Installation
1.	Copy package.json from [repo TBD] and paste it at the root location of your project
2.	Go to your terminal and cd to project root location
3.	Run “npm install” in the terminal
4.	Create a directory named “spec” under the root location of your project
5.	Navigate to node_modules/tiunit/ , copy helpers directory and paste it under “spec”
6.	Navigate to node_modules/tiunit/support, copy parser.json it under “spec/support”
7.	Copy jasmine.son from [repo TBD]  and paste it under “spec/support”
8.	Copy config.json and global.js from [repo TBD]  and paste them under “spec”
9.	Supply the right path to the rootDir property in config.json if you will be needing the root directory path later on in your code
10.	Supply the right path to the path property in parser.json
11.	All your testfiles should end with spec.js and they should all go under the “spec” directory
