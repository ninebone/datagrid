import React, { useState } from 'react';

// 1. 하위 폴더의 모든 jsx 파일까지 한 번에 가져옴 (** 패턴 사용)
const modules = import.meta.glob('./views/**/*.jsx', { eager: true });

// 2. 파일 경로를 분석하여 그룹(폴더)별로 샘플 리스트 가공
const groupedSamples = Object.keys(modules).reduce((acc, path) => {
    const relativePath = path.replace('./views/', '');
    const parts = relativePath.split('/');

    let category = 'General';
    let fileName = '';

    if (parts.length > 1) {
        category = parts[0];
        fileName = parts.slice(1).join('/').replace('.jsx', '');
    } else {
        fileName = parts[0].replace('.jsx', '');
    }

    if (!acc[category]) {
        acc[category] = [];
    }

    acc[category].push({
        name: fileName,
        fullName: `${category}/${fileName}`,
        Component: modules[path].default,
    });

    return acc;
}, {});

// 전체 샘플 목록 평탄화 (첫 번째 아이템 기본 선택용)
const allSamples = Object.values(groupedSamples).flat();

function App() {
    const [selectedFullName, setSelectedFullName] = useState(allSamples[0]?.fullName);

    // 🎛️ 사이드바 열림/닫힘 상태 관리
    const [isOpen, setIsOpen] = useState(true);

    const CurrentComponent = allSamples.find(s => s.fullName === selectedFullName)?.Component;

    return (
        <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: 'white' }}>

            {/* 좌측: 2단계 그룹별 사이드바 */}
            <div style={{
                width: isOpen ? '220px' : '0px',          // 👈 닫히면 너비를 0으로 축소
                minWidth: isOpen ? '220px' : '0px',
                textAlign: 'left',
                borderRight: isOpen ? '1px solid #ddd' : 'none',
                padding: isOpen ? '15px' : '0',           // 👈 닫히면 패딩도 없애서 깔끔하게 숨김
                overflowY: 'auto',
                overflowX: 'hidden',
                background: '#f8f9fa',
                position: 'relative',
                transition: 'width 0.2s ease, padding 0.2s ease' // 👈 부드럽게 줄어들도록 애니메이션 추가
            }}>

                {/* ❌ X 버튼 클릭 시 isOpen 상태를 반대로 토글 */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    style={{
                        background: "transparent",
                        color: "red",
                        border: "none",
                        outline: "none",
                        display: "block",
                        position: "absolute",
                        left: "10px",
                        top: "10px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        zIndex: 10
                    }}
                >
                    ✕
                </button>

                {/* 사이드바가 열려있을 때만 내용 표시 */}
                {isOpen && (
                    <div style={{ marginTop: '20px' }}>
                        <h3 style={{ fontSize: '16px', marginBottom: '15px' }}>Samples ({allSamples.length})</h3>

                        {Object.keys(groupedSamples).map((category) => (
                            <div key={category} style={{ marginBottom: '15px' }}>
                                <div style={{
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    color: '#666',
                                    textTransform: 'uppercase',
                                    marginBottom: '6px',
                                    paddingLeft: '4px'
                                }}>
                                    📁 {category}
                                </div>

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
                )}
            </div>

            {/* 사이드바가 닫혔을 때 다시 열 수 있는 아주 작은 토글 버튼 (선택사항) */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    style={{
                        background: "transparent",
                        color: "red",
                        border: "none",
                        outline: "none",
                        display: "block",
                        position: "absolute",
                        left: "10px",
                        top: "10px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        zIndex: 10
                    }}
                >
                   +
                </button>
            )}

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