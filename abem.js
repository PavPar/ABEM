//if you are reading this. I am sorry
const fs = require('fs')
const path = require('path')


const patterns = {
    allClassPatern: /\.\w*[^{;]*{/gsm,
    classContentPatternGenerator: (className) => new RegExp(`@.[^{]*\\{\\s*\\.${className}\\s*\\{.[^}]*\\}.[^}]*\\}|\\.${className}\\s*\\{.[^}{]*\}`, "gms"),
    complexClassPattern: /_(.+)_/g,
}

function createBEMStructure(inputPath, outputPath) {
    const fullOutputPath = path.join(__dirname, outputPath);

    fs.readFile(inputPath, 'utf8', (err, data) => {
        if (err) {
            console.error(err)
            return
        }
        const classes = getAllClasses(data)
        const parsedClasses = parseClasses(classes)

        const folderStructure = [];
        parsedClasses.forEach(classData => {
            classData.fileData = getClassContent(classData.className, data)
        })


        console.log(parsedClasses)

        if (!fs.existsSync(fullOutputPath)) {
            fs.mkdirSync(fullOutputPath)
        }

        let miscPath = path.join(fullOutputPath, "misc.css");

        parsedClasses.forEach(classData => {
            // 
            let currPath = fullOutputPath;

            // if (file.parent !== "root") {
            //     currPath = path.join(currPath, file.parent)
            // }

            console.log(classData)

            currPath = path.join(currPath, classData.block, classData.element, classData.mod.modFolderName || "")


            console.log(currPath)
            if (classData.misc) {
                writeToMisc(miscPath, classData.fileData.content)
                return
            }
            createFolderAndFile(currPath, classData.className, classData.fileData.content.join("\n"))

        })

        console.log(getAllFiles(fullOutputPath))
    })
}

const getAllFiles = function(dirPath, arrayOfFiles) {
    files = fs.readdirSync(dirPath)
  
    arrayOfFiles = arrayOfFiles || []
  
    files.forEach(function(file) {
      if (fs.statSync(dirPath + "/" + file).isDirectory()) {
        arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
      } else {
        arrayOfFiles.push(path.join(__dirname, dirPath, "/", file))
      }
    })
  
    return arrayOfFiles
  }
//todo optimise
function parseClasses(classes) {
    const res = []
    classes.forEach(className => {
        className = className.trim()
        const isComplex = className.split(patterns.complexClassPattern).length == 3;
        const isElement = className.split(/__/g).length == 2;
        const isMod = className.split('_').length == 2;

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
        //TODO check for misc


    })
    return res
}

function splitMOD(mod) {
    const modFolderName = "_" + mod.split("-")[0]
    return { modFolderName, mod }
}
function createFolderAndFile(folderPath, fileName, fileData) {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true })
    }

    fs.writeFileSync(path.join(folderPath, `${fileName}.css`), fileData)
}

function writeToMisc(path, fileData) {
    fs.writeFileSync(path, "\n" + fileData)
}

function getAllClasses(rawData) {
    const blocks = [...rawData.matchAll(patterns.allClassPatern)]

    return Array.from(new Set(blocks.map(block => block[0].trim().replace('{', '').replace('.', ''))))
}

//TODO: Different search for blocks and elements
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

function setImports(blockPath) {
}

createBEMStructure('./index.css', './blocks')

