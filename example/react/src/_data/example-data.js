const exampleData = {
    generateCommonCode(group) {
        const masterCommonCodes = [
            { group: 'DEPART', code: 'A', codename: 'Planning' },
            { group: 'DEPART', code: 'B', codename: 'Development' },
            { group: 'DEPART', code: 'C', codename: 'Design' },
            { group: 'DEPART', code: 'D', codename: 'Marketing' },
            { group: 'DEPART', code: 'E', codename: 'Sales' },
            { group: 'DEPART', code: 'F', codename: 'HR' },
            { group: 'STATUS', code: 'C', codename: 'Completed' },
            { group: 'STATUS', code: 'W', codename: 'Wating' },
            { group: 'SEX', code: 'M', codename: 'Male' },
            { group: 'SEX', code: 'F', codename: 'Female' },
            { group: 'COLOR', code: '#ffffff', codename: 'white' },
            { group: 'COLOR', code: '#ff0000', codename: 'red' },
            { group: 'COLOR', code: '#00ff00', codename: 'green' },
            { group: 'COLOR', code: '#0000ff', codename: 'blud' },
            { group: 'COLOR2', code: '#00ffff', codename: 'a' },
            { group: 'COLOR2', code: '#ffff00', codename: 'b' },
            { group: 'COLOR2', code: '#ff00ff', codename: 'c' },
            { group: 'COLOR3', code: '#0000ff', codename: 'blue' },
            { group: 'COLOR3', code: '#000000', codename: 'black' },
            { group: 'COLOR3', code: '#808080', codename: 'gray' },
            { group: 'COLOR3', code: '#c0c0c0', codename: 'silver' },
            { group: 'COLOR3', code: '#ffff00', codename: 'yellow' },
            { group: 'COLOR3', code: '#ffa500', codename: 'orange' },
            { group: 'COLOR3', code: '#800080', codename: 'purple' },
            { group: 'COLOR3', code: '#ffc0cb', codename: 'pink' },
            { group: 'COLOR3', code: '#a52a2a', codename: 'brown' },
            { group: 'COLOR3', code: '#00ffff', codename: 'cyan' },
            { group: 'COLOR3', code: '#800000', codename: 'maroon' },
            { group: 'COLOR3', code: '#008000', codename: 'darkgreen' },
            { group: 'COLOR3', code: '#000080', codename: 'navy' },
            { group: 'COLOR3', code: '#808000', codename: 'olive' },
            { group: 'COLOR3', code: '#ffd700', codename: 'gold' },
            { group: 'COLOR3', code: '#4b0082', codename: 'indigo' },
            { group: 'COLOR3', code: '#ee82ee', codename: 'violet' },
            { group: 'COLOR3', code: '#40e0d0', codename: 'turquoise' },
            { group: 'COLOR3', code: '#faebd7', codename: 'antiquewhite' },
            { group: 'COLOR3', code: '#f5f5dc', codename: 'beige' },
        ];

        return masterCommonCodes.filter(item => item.group === group);
    },
    generateRandomData(cnt) {
        const getRandomString = (len, an) => {
            an = an && an.toLowerCase();
            var s = "", min = an == "a" ? 10 : 0, max = an == "n" ? 10 : 62;

            for (var i = 0; i < len; i++) {
                var r = Math.floor(Math.random() * (max - min) + min);
                s += String.fromCharCode(r += r > 9 ? r < 36 ? 55 : 61 : 48);
            }
            return s;
        };

        const getRandomInt = (v) => {
            return Math.floor(Math.random() * v);
        };

        const getRandomAmount = (min = 100000, max = 50000000, step = 10000) => {
            const steps = Math.floor((max - min) / step);
            return Math.floor(Math.random() * steps) * step + min;
        };

        const getRandom = (arr) => {
            return arr[Math.floor(Math.random() * arr.length)];
        };

        const getRandomNameKor = () => {
            const data1 = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "류", "전", "홍", "고", "문", "양", "손", "배", "조", "백", "허", "유", "남", "심", "노", "정", "하", "곽", "성", "차", "주", "우", "구", "신", "임", "나", "전", "민", "유", "진", "지", "엄", "채", "원", "천", "방", "공", "강", "현", "함", "변", "염", "양", "변", "여", "추", "노", "도", "소", "신", "석", "선", "설", "마", "길", "주", "연", "방", "위", "표", "명", "기", "반", "왕", "금", "옥", "육", "인", "맹", "제", "모", "장", "남", "탁", "국", "여", "진", "어", "은", "편", "구", "용"];
            const data2 = ["가", "강", "건", "경", "고", "관", "광", "구", "규", "근", "기", "길", "나", "남", "노", "누", "다", "단", "달", "담", "대", "덕", "도", "동", "두", "라", "래", "로", "루", "리", "마", "만", "명", "무", "문", "미", "민", "바", "박", "백", "범", "별", "병", "보", "빛", "사", "산", "상", "새", "서", "석", "선", "설", "섭", "성", "세", "소", "솔", "수", "숙", "순", "숭", "슬", "승", "시", "신", "아", "안", "애", "엄", "여", "연", "영", "예", "오", "옥", "완", "요", "용", "우", "원", "월", "위", "유", "윤", "율", "으", "은", "의", "이", "익", "인", "일", "잎", "자", "잔", "장", "재", "전", "정", "제", "조", "종", "주", "준", "중", "지", "진", "찬", "창", "채", "천", "철", "초", "춘", "충", "치", "탐", "태", "택", "판", "하", "한", "해", "혁", "현", "형", "혜", "호", "홍", "화", "환", "회", "효", "훈", "휘", "희", "운", "모", "배", "부", "림", "봉", "혼", "황", "량", "린", "을", "비", "솜", "공", "면", "탁", "온", "디", "항", "후", "려", "균", "묵", "송", "욱", "휴", "언", "령", "섬", "들", "견", "추", "걸", "삼", "열", "웅", "분", "변", "양", "출", "타", "흥", "겸", "곤", "번", "식", "란", "더", "손", "술", "훔", "반", "빈", "실", "직", "흠", "흔", "악", "람", "뜸", "권", "복", "심", "헌", "엽", "학", "개", "롱", "평", "늘", "늬", "랑", "얀", "향", "울", "련"];
            return getRandom(data1) + getRandom(data2) + getRandom(data2);
        };
        const getRandomName = () => {
            const firstNames = [
                "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles",
                "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen",
                "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Paul", "Andrew", "Joshua", "Kenneth"
            ];
            const lastNames = [
                "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
                "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
                "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"
            ];
            return `${getRandom(firstNames)} ${getRandom(lastNames)}`;
        };

        const getRandomTel = () => {
            return "010-****-" + (getRandomInt(9000) + 1000);
        };

        const getRandomHearColor = () => {
            return "#" + nine.lpad(getRandomInt(255).toString(16), 2) + nine.lpad(getRandomInt(255).toString(16), 2) + nine.lpad(getRandomInt(255).toString(16), 2);
        };

        const getRandomHearColor3 = () => {
            const arr = exampleData.generateCommonCode("COLOR3");
            //trace.log(exampleData.generateCommonCode("COLOR3"));
            const index = getRandomInt(arr.length);
            return arr[index].code;
        };

        const getRandomRemark = () => {
            let v = "";
            for (var i = 0; i < getRandomInt(5); i++) {
                for (var j = 0; j < getRandomInt(5) + 2; j++) {
                    v += getRandomString(getRandomInt(5) + 5) + " ";
                }
                v += "\n";
            }
            return v.trim();
        };

        var data = [];
        for (var i = 0; i < cnt; i++) {
            data.push({
                ORDER:     i + 1,
                NAME:      [4,13,100].includes(i) ? 'nandoo' : getRandomName(),
                PIC:       `./images/pic/pic_${getRandomInt(20)}.jpg`,
                SEX:       getRandom(["M", "F"]),
                AGE:       20 + getRandomInt(80),
                TEL:       getRandomTel(),
                COLOR1:     getRandomHearColor(),
                COLOR2:     getRandomHearColor(),
                COLOR3:    getRandomHearColor3(),
                REC1:      getRandomInt(101),
                REC2:      getRandomInt(101),
                REC3:      getRandomInt(101),
                REC4:      getRandomInt(101),
                REC5:      getRandomInt(101),
                REC6:      getRandomInt(101),
                REC7:      getRandomInt(101),
                REC8:      getRandomInt(101),
                REC9:      getRandomInt(101),
                REC10:      getRandomInt(101),
                REC11:      getRandomInt(101),
                REC12:      getRandomInt(101),

                AMT1:      getRandomAmount(100000, 100000000, 10000),
                AMT2:      getRandomAmount(500000, 50000000, 10000),
                AMT3:      getRandomAmount(1000000, 300000000, 50000),

                STATUS:     getRandom(["", "C", "W"]),
                DEPART:    getRandom(["", "A", "B", "C", "D", "E", "F", "G"]),
                DEPART1:    getRandom(["", "A", "B", "C", "D", "E", "F", "G"]),
                DEPART2:    getRandom(["", "A", "B", "C", "D", "E", "F", "G"]),
                BIRTH_YMD:  `${getRandomInt(60)+1950}-${nine.lpad(getRandomInt(12)+1, 2)}-${nine.lpad(getRandomInt(28)+1, 2)}`,
                BIRTH_DT:  `${getRandomInt(60)+1950}-${nine.lpad(getRandomInt(12)+1, 2)}-${nine.lpad(getRandomInt(28)+1, 2)}T${nine.lpad(getRandomInt(23)+1, 2)}:${nine.lpad(getRandomInt(59)+1, 2)}`,
                M:         `${getRandomInt(60)+1950}-${nine.lpad(getRandomInt(12)+1, 2)}`,
                W:         `${getRandomInt(60)+1950}-W${nine.lpad(getRandomInt(52)+1, 2)}`,
                T:         `${nine.lpad(getRandomInt(23)+1, 2)}:${nine.lpad(getRandomInt(59)+1, 2)}`,
                MON1:      `${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)}`,
                MON2:      `${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)}`,
                MON3:      `${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)},${getRandomInt(101)}`,
                RMK:       "",
                RMK1:      getRandomRemark(),
                RMK2:      getRandomRemark(),
            });
        }
        return data;
    }
};



export { exampleData };
