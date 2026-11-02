import React, { useState } from 'react';

// 1. 특정 폴더 안의 모든 jsx 파일을 한 번에 가져옴 (eager: true)
const modules = import.meta.glob('./views/*.jsx', { eager: true });

// 2. 파일 경로를 가공하여 샘플 리스트 생성
const samples = Object.keys(modules).map((path) => {
    const fileName = path.replace('./views/', '').replace('.jsx', '');
    return {
        name: fileName,
        Component: modules[path].default,
    };
});

function App() {
    const [selectedName, setSelectedName] = useState(samples[0]?.name);
    const CurrentComponent = samples.find(s => s.name === selectedName)?.Component;

    return (
        <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: 'white', }}>

            {/* 좌측: 동적으로 생성된 샘플 목록 사이드바 */}
            <div style={{ width: '180px', textAlign: 'left', borderRight: '1px solid #ddd', padding: '15px', overflowY: 'auto', background: '#f8f9fa' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Samples ({samples.length})</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {samples.map((sample) => (
                        <li
                            key={sample.name}
                            onClick={() => setSelectedName(sample.name)}
                            style={{
                                padding: '2px 12px',
                                marginBottom: '4px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                background: selectedName === sample.name ? '#007bff' : 'transparent',
                                color: selectedName === sample.name ? '#fff' : '#333',
                                fontSize: '13px'
                            }}
                        >
                            {sample.name}
                        </li>
                    ))}
                </ul>
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