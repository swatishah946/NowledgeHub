import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { Toaster } from 'react-hot-toast';

const Layout = ({ children }) => {
    return (
        <>
            <Toaster
                position="top-center"
                // Add this containerStyle to push the toasts down
                containerStyle={{
                    top: 85,
                }}
                toastOptions={{
                    duration: 1500,
                    style: {
                        background: '#363636',
                        color: '#fff',
                    },
                    success: {
                        duration: 1500,
                        theme: {
                            primary: 'green',
                            secondary: 'black',
                        },
                    },
                }}
            />
            <Navbar />
            <main style={{ minHeight: '80vh' }}>
                {children}
            </main>
            <Footer />
        </>
    );
};

export default Layout;