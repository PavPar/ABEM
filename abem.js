//if you are reading this. I am sorry
const exp = require('constants');
const fs = require('fs');
const { dirname } = require('path');
const path = require('path')

//Patterns to detect classes
const patterns = {
    allClassPatern: /\.\w*[^{;]*{/gsm,
    classContentPatternGenerator: (className) => new RegExp(`@.[^{]*\\{\\s*\\.${className}\\s*\\{.[^}]*\\}.[^}]*\\}|\\.${className}\\s*\\{.[^}{]*\}`, "gms"),
    complexClassPattern: /_(.+)_/g,
}

//Main function, takes input of index.css and where to put result
function createBEMStructure(inputPath, outputPath) {
    const fullOutputPath = path.join(__dirname, outputPath);//Make full path wit

    fs.readFile(inputPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err)
            return
        }
        const classes = getAllClasses(data)//Detect all classes from index.css
        const parsedClasses = parseClasses(classes)//Parse Block,Element and Mod from classname

        parsedClasses.forEach(classData => {
            classData.fileData = getClassContent(classData.className, data) //Get content of each class from index.css
        })

        if (!fs.existsSync(fullOutputPath)) { 
            fs.mkdirSync(fullOutputPath)// Create output dir if it's not there
        }

        const misc = [] // All stuff that was detected as class, but wasnt sure where to put it 
        parsedClasses.forEach(classData => {
            let currPath = fullOutputPath;//curr constructed path

            currPath = path.join(currPath, classData.block, classData.element, classData.mod.modFolderName || "") // create path as block/__element/_type (worst scenario)

            if (classData.misc) { 
                misc.push(classData.fileData.content)
                return
            }

            createFolderAndFile(currPath, classData.className, classData.fileData.content.join("\n")) //create folder and file and put content in it

        })

        /*
        ======
        Now begins the fun of imports aka tree problem
        ======
        */

        files = fs.readdirSync(fullOutputPath)

        const globalExports = [] //All the types of blocks should go to imports section, because sometimes it doesnt overlaps some of proporeties when used
        const blocks = [] //All paths of block's css files
        
        files.forEach(file => {
            
            const filePath = path.join(fullOutputPath, file); 

            if (fs.statSync(filePath).isDirectory()) {
                const { imports, exports } = getImports(filePath);//basicly go recusive in block folder and import types, and elements
                const blockPath = path.join(filePath, `${file}.css`);
                
                console.log(filePath);// Just leave it here for pretty output

                globalExports.push(...exports)

                if (fs.existsSync(blockPath)) {
                    const data = fs.readFileSync(blockPath);//copy data that exists in file

                    fs.writeFileSync(blockPath, generateImports(imports, filePath));//write imports
                    fs.appendFileSync(blockPath, data);//return data

                    blocks.push(blockPath);
                } else {
                    fs.writeFileSync(blockPath, generateImports(imports, filePath));//or just create file with imports
                }
            }
        })

        const resPath = path.join(__dirname, "imports.css")//HardCode

        fs.appendFileSync(resPath, generateImports(globalExports));
        fs.writeFileSync(resPath, generateImports(blocks));
        fs.appendFileSync(resPath, misc.join('\n'));
    })
}

//Create import line from paths
function generateImports(imports, filePath = __dirname) {
    return imports.map(importPath => {
        return `@import url("${path.join('.', path.relative(filePath, importPath))}");`
    }).join('\n') + '\n'
}

//fkn trees,recursive tree stuff that gets all imports
function getImports(dirPath, imports = [], level = 0) {
    files = fs.readdirSync(dirPath)
    const exports = [];//All types that should be exported

    files.forEach((file) => {
        const filePath = path.join(dirPath, file)

        if (fs.statSync(filePath).isDirectory()) {
            if (file.startsWith("__")) {
                getImports(filePath, imports, level + 1) //if element
                return
            }

            if (level !== 0) {
                getImports(filePath, imports, level + 1)//if type and not firs level
            } else {
                exports.push(...getImports(filePath, [], level + 1).imports) // this line needed because block types should be higher than block scope
            }
            return
        }
        if (level == 0) { return }//dont put path of files in import on level 0
        imports.unshift(filePath)//Put all files above paths of folders, so that it would be overlaped by types paths
    })

    return { imports, exports };
}

//todo optimise
//Class data parsing
function parseClasses(classes) {
    const res = []
    classes.forEach(className => {

        className = className.trim()

        const isComplex = className.split(patterns.complexClassPattern).length == 3;//Example of complex stuff block__element_mod-foo
        const isElement = className.split(/__/g).length == 2; //basicly is block__element
        const isMod = className.split('_').length == 2; // block_mod-a or block__element_mod-a

        // console.log(className, isComplex, isElement, isMod)
        // console.log(className, className.split(patterns.complexClassPattern), className.split('__'), className.split('_'))
       
        if (isComplex) {
            const [block, element, mod] = className.split(patterns.complexClassPattern).map(val => val.trim())
            res.push({
                className: className,
                block: block,
                element: "__" + element.replace("_", ""),
                mod: splitMOD(mod),
                misc: false,
            })
            return;
        }


        if (isElement) {
            const [block, element] = className.split('__').map(val => val.trim())
            res.push({
                className: className,
                block: block,
                element: "__" + element,
                mod: "",
                misc: false
            })
            return
        }

        if (isMod) {
            const [block, mod] = className.split('_').map(val => val.trim())
            res.push({
                className: className,
                block: block,
                element: "",
                mod: splitMOD(mod),
                misc: false
            })
            return
        }

        if (!className.replace(/[a-zA-Z]*/g, "")) {
            res.push({
                className: className,
                block: className,
                element: "",
                mod: "",
                misc: false
            })
            return
        }

        res.push({
            className: className,
            block: "",
            element: "",
            mod: "",
            misc: true
        })

    })
    return res
}

//gets data from mod block_mod-abc
function splitMOD(mod) {
    const modFolderName = "_" + mod.split("-")[0]
    return { modFolderName, mod }
}

//creates folder and file
function createFolderAndFile(folderPath, fileName, fileData) {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true })
    }

    fs.writeFileSync(path.join(folderPath, `${fileName}.css`), fileData)
}

//gets all classes names from index.css
function getAllClasses(rawData) {
    const blocks = [...rawData.matchAll(patterns.allClassPatern)]

    return Array.from(new Set(blocks.map(block => block[0].trim().replace('{', '').replace('.', ''))))
}

//gets class content from index.css
function getClassContent(className, data) {
    className = className.trim()
    const content = [...data.matchAll(patterns.classContentPatternGenerator(className))];
    const [parent, child] = className.split('__');

    return {
        className: className,
        content: content.map(block => block[0]),
        onlyOne: !(content.length - 1),
        parent: parent !== className ? parent : "root",
        folderName: child ? "__" + child : parent,
    }
}

createBEMStructure('./index.css', './blocks')

