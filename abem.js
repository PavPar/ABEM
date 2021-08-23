const fs = require('fs')
const path = require('path')

function createBEMStructure(inputPath, outputPath) {
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

        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath)
        }


        folderStructure.forEach(file => {
            // 
            let currPath = outputPath;

            if (file.parent !== "root") {
                currPath = path.join(currPath, file.parent)
            }

            currPath = path.join(currPath, file.folderName)
            console.log(currPath)
            createFolderAndFile(currPath,file.className,file.content.join("\n"))
        })
    })
}

function createFolderAndFile(folderPath, fileName, fileData) {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true })
    }

    fs.writeFileSync(path.join(folderPath, `${fileName}.css`), fileData)

}

function getAllClasses(rawData) {
    const blocks = [...rawData.matchAll(/\.\w* {|\.\w* \n{/g)]

    return Array.from(new Set(blocks.map(block => block[0].trim().replace('{', '').replace('.', ''))))
}

function getClassContent(className, data) {
    className = className.trim()
    const pattern = new RegExp(`@.[^{]*\\{\\s*\\.${className}\\s*\\{.[^}]*\\}.[^}]*\\}|\\.${className}\\s*\\{.[^}]*\\}`, "gms")
    const content = [...data.matchAll(pattern)];
    const [parent, child] = className.split('__');

    return {
        className: className,
        content: content.map(block => block[0]),
        onlyOne: !(content.length - 1),
        parent: parent !== className ? parent : "root",
        folderName: child ? "__" + child : parent,
    }

}


createBEMStructure('.index.css', path.join(__dirname,'./blocks'))
// function getClassModificators(className,data){
//     const pattern
// }