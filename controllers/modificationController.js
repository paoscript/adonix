var express = require('express');
var router = express.Router();
const modificationService = require("../services/modificationService");
const apprenticesService = require("../services/apprenticesService");
const generatorReportService = require("../services/generatorReportService");
const fs = require('fs')
const path = require('path')

var listTypeModifications = ["Incapacidad", "Fuerza Mayor o Caso Fortuito", "Licencia Paternidad", "Licencia Maternidad", "Vacaciones del Empleador"];

/* GET create user page. */
router.get('/create', function(req, res, next) {
    let idUser = req.cookies.idUser;
    let idRolUser = req.cookies.idRole

    listOptionsTypeModification = listTypeModifications;

    if (idUser === undefined) {
        res.redirect('/login');
    } else {
        res.render('modifications_create', 
            { 
                title: 'Create New Modification',
                isHasMenuUserPermition: idRolUser == 1 ? true : false, 
                isWithInterface: true,  
                listModifications: listOptionsTypeModification
            }
        );
    }
});

/* GET consult users page. */
router.get('/consult', async function(req, res, next) {
    let idUser = req.cookies.idUser;
    let idRolUser = req.cookies.idRole;

    let listModifications = await modificationService.getModificationsList();

    let pagination = []

    if (listModifications.length > 0) {
        let cantidad = Math.ceil(listModifications.length / 10)

        for (let index = 0; index < cantidad; index++) {
            pagination.push({number: index + 1})            
        }
    }

    if (idUser === undefined) {
        res.redirect('/login');
    } else {
        res.render('modifications_consult', 
            { 
                title: 'Consult Modifications', 
                isWithInterface: true, 
                isHasMenuUserPermition: idRolUser == 1 ? true : false,
                hasDowloadRecordPermition: idRolUser == 1 || idRolUser == 2 ? true : false,
                countRecords: listModifications.length, 
                listModifications: listModifications, 
                pagination: pagination
            }
        );
    }
});




/* GET create user page. */
router.get('/edit/:modificationId', async function(req, res, next) {
    let idUser = req.cookies.idUser;
    let idRolUser = req.cookies.idRole;
    const modificationId = req.params.modificationId;
    let modification = await modificationService.getModificationById(modificationId);
    
    if(modification === "") {
        res.redirect('/users/edit/errors/error-404.html');
        return;
    }

    let apprentice = await apprenticesService.getApprenticeById(modification.mod_apprentice_id);
    let apprentice_id = apprentice.app_identification;

    let listOptionsTypeModification = await orderOptions(modification.mod_type_modification, listTypeModifications)

    console.log(listOptionsTypeModification)

    if (idUser === undefined) {
        res.redirect('/login');
    } else {
        res.render('modifications_edit', 
            { title: 'Edit User', 
            isWithInterface: true,
            isHasMenuUserPermition: idRolUser == 1 ? true : false, 
            modification: modification, 
            apprentice_id: apprentice_id, 
            url: "/modifications/update/", 
            listOptionsTypeModification: listOptionsTypeModification
        }
    );
    }
});

/* GET create user page. */
router.post('/create/newModification', async function(req, res, next) {
    let idUser = req.cookies.idUser;

    if (idUser === undefined) {
        res.redirect('/login');
        return;
    }

    let {typeModification, documentId, dateStart, dateEnd, countDays} = req.body;

    let apprentice = await apprenticesService.getApprenticeByNumberIdentification(documentId);

    if (apprentice === undefined) {

        let listOptionsTypeModification = orderOptions(typeModification, listTypeModifications)

        let modification = {
            mod_type_modification: typeModification,
            mod_date_start: dateStart,
            mod_date_end: dateEnd,
            mod_count_day: countDays,
        }
        res.render('modifications_edit', { title: 'Edit User', isWithInterface: true, modification: modification, apprentice_id: documentId, alerta: true, url: "/modifications/create/newModification", listModifications: listOptionsTypeModification});
        return;
    }

    await modificationService.createModification(typeModification, apprentice.app_id, dateStart, dateEnd, countDays, idUser);
    
    res.redirect('/modifications/consult/')

});

/* GET create user page. */
router.post('/delete/:modificationId', async function(req, res, next) {
    let idUser = req.cookies.idUser;

    const modificationId = req.params.modificationId;

    if (idUser === undefined) {
        res.redirect('/login');
        return;
    }


    await modificationService.deleteModificationById(modificationId)

    res.redirect('/modifications/consult/')

});

/* GET create user page. */
router.post('/update/:modificationId', async function(req, res, next) {
    let idUser = req.cookies.idUser;
    let idRolUser = req.cookies.idRole;
    const modificationId = req.params.modificationId;

    if (idUser === undefined) {
        res.redirect('/login');
        return;
    }

    let {typeModification, documentId, dateStart, dateEnd, countDays} = req.body;
    let apprentice = await apprenticesService.getApprenticeByNumberIdentification(documentId);

    if (apprentice === undefined) {

        let listOptionsTypeModification = orderOptions(typeModification, listTypeModifications)

        let modification = {
            mod_id: modificationId,
            mod_type_modification: typeModification,
            mod_date_start: dateStart,
            mod_date_end: dateEnd,
            mod_count_day: countDays,
        }
        res.render('modifications_edit', 
            { 
                title: 'Edit User', 
                isWithInterface: true,
                isHasMenuUserPermition: idRolUser == 1 ? true : false, 
                modification: modification, 
                apprentice_id: documentId, 
                alerta: true, 
                url: "/modifications/update/", 
                listOptionsTypeModification: listOptionsTypeModification
            }
        );
        return;
    }

    await modificationService.updateModificationById(typeModification, dateStart, dateEnd, countDays, apprentice.app_id, modificationId);

    res.redirect('/modifications/consult/')
});

router.get('/dowload', async (req, res, next) => {
    let idUser = req.cookies.idUser;
    await generatorReportService.generateModificationsReport(idUser);

    let file = fs.readFileSync(path.join(__dirname, `../public/reports/${idUser}/modifications.xlsx`), 'binary');

    res.setHeader('Content-Length', file.length);
    res.setHeader('Content-disposition', 'attachment; filename=modifications.xlsx');
    res.write(file, 'binary')

    res.end();
});

function orderOptions(first, listOptions) {
    list = [first]

    listOptions.forEach(element => {
        if (element != first) {
            list.push(element)
        }
    });

    return list;
}

module.exports = router;