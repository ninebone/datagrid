import React, { useState, useEffect } from 'react'
import { useLocation, Navigate } from 'react-router-dom';
import MyCustom404 from "@/core/frame/Error404.jsx";
import LeftMenu from "@/core/menu/LeftMenu.jsx";
import TopMenu from "@/core/menu/TopMenu.jsx";
import '@ninebone/ux';
import { NineHook } from '@ninebone/mu';
import menuData from "/public/data/routes.json";

const rawViews = import.meta.glob("../../views/**/*.jsx");

const projectViews = Object.keys(rawViews).reduce((acc, key) => {
    const cleanKey = key.replace("../../views/", "");
    acc[cleanKey] = rawViews[key];
    return acc;
}, {});

export const AuthGuard = () => {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(false);
    }, []);

    if (location.pathname === "/") {
        return <Navigate to="/Overview" replace />;
    }

    if (loading) {
        return <div style={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center" }}>로딩 중...</div>;
    }

    return (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <TopMenu />
            <LeftMenu menuData={menuData} />
            <NineHook menuData={menuData} views={projectViews} error404={MyCustom404} />
        </div>
    );
};