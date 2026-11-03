import React, { useState } from 'react';

// 1. 하위 폴더의 모든 jsx 파일까지 한 번에 가져옴 (** 패턴 사용)
const modules = import.meta.glob('./views/**/*.jsx', { eager: true });

// 2. 파일 경로를 분석하여 그룹(폴더)별로 샘플 리스트 가공
const groupedSamples = Object.keys(modules).reduce((acc, path) => {
    // 예: './views/Layouts/Header.jsx' -> ['Layouts', 'Header']
    // 예: './views/Button.jsx' -> ['General', 'Button'] (폴더가 없는 경우 처리)
    const relativePath = path.replace('./views/', '');
    const parts = relativePath.split('/');

    let category = 'General';
    let fileName = '';

    if (parts.length > 1) {
        category = parts[0]; // 첫 번째 폴더명을 카테고리(그룹)로 사용
        fileName = parts.slice(1).join('/').replace('.jsx', '');
    } else {
        fileName = parts[0].replace('.jsx', '');
    }

    if (!acc[category]) {
        acc[category] = [];
    }

    acc[category].push({
        name: fileName,
        fullName: `${category}/${fileName}`, // 고유 식별용
        Component: modules[path].default,
    });

    return acc;
}, {});

// 전체 샘플 목록 평탄화 (첫 번째 아이템 기본 선택용)
const allSamples = Object.values(groupedSamples).flat();

function App() {
    const [selectedFullName, setSelectedFullName] = useState(allSamples[0]?.fullName);
    const CurrentComponent = allSamples.find(s => s.fullName === selectedFullName)?.Component;

    return (
        <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: 'white' }}>

            {/* 좌측: 2단계 그룹별 사이드바 */}
            <div style={{ width: '220px', textAlign: 'left', borderRight: '1px solid #ddd', padding: '15px', overflowY: 'auto', background: '#f8f9fa' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>Samples ({allSamples.length})</h3>

                {Object.keys(groupedSamples).map((category) => (
                    <div key={category} style={{ marginBottom: '15px' }}>
                        {/* 카테고리(폴더) 제목 */}
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase', marginBottom: '6px', paddingLeft: '4px' }}>
                            📁 {category}
                        </div>

                        {/* 해당 폴더 소속 컴포넌트 리스트 */}
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {groupedSamples[category].map((sample) => (
                                <li
                                    key={sample.fullName}
                                    onClick={() => setSelectedFullName(sample.fullName)}
                                    style={{
                                        padding: '4px 12px',
                                        marginBottom: '3px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        background: selectedFullName === sample.fullName ? '#007bff' : 'transparent',
                                        color: selectedFullName === sample.fullName ? '#fff' : '#333',
                                        fontSize: '13px'
                                    }}
                                >
                                    {sample.name}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* 우측: 선택된 샘플 컴포넌트 렌더링 영역 */}
            <div style={{
                flex: 1,
                height: '100%',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'auto',
            }}>
                {CurrentComponent ? (
                    <CurrentComponent />
                ) : (
                    <div style={{ padding: '20px' }}>샘플을 선택해주세요.</div>
                )}
            </div>

        </div>
    );
}

export default App;