const sqltt = require("../");
const commonFields = ["dptId", "name", "sex", "birth"];

const q = {};

q.list = new sqltt(`
    select id, dptId, dptName, name, sex
    from personnel
    join depts using(dptId)
`);


q.listByDept = new sqltt($=>$`
    ${q.list}                 ${$.REM("Same as ${$.include(q.list)}")}
    where dptId = ${"dptId"}  ${$.REM("Same as ${$.arg('dptId')}")}
`);

q.show = new sqltt($=>$`
    select id, dptName, name, birth, ctime
    from personnel
    join depts using(dptId)
    where id = ${"id"}
`);

q.insert = new sqltt($=>$`
    insert into personnel (${$.keys(commonFields)})
    values (${$.values(commonFields)})
`);

q.update = new sqltt({
    args: ["id"], // Specify 'id' as first parameter
    sql: $=>$`
        update personnel set ${$.entries(commonFields)}
        where id = ${"id"}
    `
});

sqltt.publish(module, q); // Export and make available from CLI


// user@host:~/examples$ node users.sql.js list | psql tiaDB
//
//  id |   name    | sex | dptName        |   birth    |           ctime
// ----+-----------+-----+----------------+------------+----------------------------
//   1 | Mortadelo | m   | Operations     | 1969-03-10 | 2019-05-31 10:58:09.346467
//   2 | Filemon   | m   | Operations     | 1965-08-15 | 2019-05-31 10:58:46.291629
//   3 | Ofelia    | f   | Administration | 1972-08-29 | 2019-05-31 11:05:16.594719
//   4 | Bacterio  | m   | I+D            | 1965-08-15 | 2019-05-31 11:05:35.807663
// (...)
//

// insert into personnel (company, name, sex, dptId, birth, ctime)
// values
//     ('TIA', 'Super', 'm', 'management', '1963-05-23', '1984-05-31 11:05:35.807663'),
//     ('TIA', 'Mortadelo', 'm', 'oper', '1969-03-10', '1984-05-31 10:58:09.346467'),
//     ('TIA', 'Filemon', 'm', 'oper', '1965-08-15', '1984-05-31 10:58:46.291629'),
//     ('TIA', 'Ofelia', 'f', 'adm', '1972-08-29', '1984-05-31 11:05:16.594719'),
//     ('TIA', 'Bacterio', 'm', 'i+d', '1967-07-02', '1984-05-31 11:05:35.807663'),
//     ('KAOS', 'Ladronez', 'm', null, '1974-11-17', '1985-08-13 11:05:35.807663'),
//     ('KAOS', 'Tontez', 'm', null, '1974-11-17', '1985-08-13 11:05:35.807663')
// ;


// insert into depts
// values
//     ('management', 'Management'),
//     ('oper', 'Operations'),
//     ('adm', 'Administration'),
//     ('i+d', 'I+D')
// ;



