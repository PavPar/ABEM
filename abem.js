const fs = require('fs')
const path = require('path')

const patterns = {
    allClassPatern: /\.\w*[^{;]*{/gsm,
    classContentPatternGenerator: (className) => new RegExp(`@.[^{]*\\{\\s*\\.${className}\\s*\\{.[^}]*\\}.[^}]*\\}|\\.${className}\\s*\\{.[^}{]*\}`, "gms"),
    complexClassPattern: /_(.+)_/g,
}

function createBEMStructure(inputPath, outputPath) {
    const fullOutputPath = path.join(__dirname, outputPath);

    fs.readFile('./index.css', 'utf8', (err, data) => {
        if (err) {
            console.error(err)
            return
        }
        const classes = getAllClasses(data)


        const folderStructure = [];
        classes.forEach(classVal => {
            folderStructure.push(getClassContent(classVal, data))
        })

        // console.log(folderStructure)

        if (!fs.existsSync(fullOutputPath)) {
            fs.mkdirSync(fullOutputPath)
        }
        console.log(parseClasses(classes))
        folderStructure.forEach(file => {
            // 
            let currPath = fullOutputPath;

            if (file.parent !== "root") {
                currPath = path.join(currPath, file.parent)
            }



            currPath = path.join(currPath, file.folderName)
            // console.log(currPath)
            // createFolderAndFile(currPath,file.className,file.content.join("\n"))
        })
    })
}

//todo optimise
function parseClasses(classes) {
    const res = []
    classes.forEach(className => {


        const isComplex = className.split(patterns.complexClassPattern).length == 3;
        const isElement = className.split(/__/g).length == 2;
        const isMod = className.split('_').length == 2;

        console.log(className,isComplex,isElement,isMod)
        console.log(className,className.split(patterns.complexClassPattern),className.split('__'),className.split('_'))
        if (isComplex) {
            const [block, element, mod] = className.split(patterns.complexClassPattern)
            res.push({
                block: block,
                element: element.replace("_",""),
                mod: mod || ""
            })
            return;
        }


        if (isElement) {
            const [block, element] = className.split('__')
            res.push({
                block: block,
                element: element,
                mod: ""
            })
            return
        }

        if (isMod) {
            const [block, mod] = className.split('_')
            res.push({
                block: block,
                element: "",
                mod: mod
            })
            return
        }

        //TODO check for misc
        res.push({
            block: className,
        })

    })
    return res
}

function createFolderAndFile(folderPath, fileName, fileData) {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true })
    }

    fs.writeFileSync(path.join(folderPath, `${fileName}.css`), fileData)

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

createBEMStructure('.index.css', './blocks')

