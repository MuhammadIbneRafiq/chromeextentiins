        // Simulate warnings
        function simulateWarnings() {
            warningCount = maxWarnings - 1;
            alert(`Warning count set to ${warningCount}. Next off-topic query will trigger a block!`);
        }
        
        // Simulate block
        function simulateBlock() {
            warningCount = maxWarnings;
            showBlockSimulation();
        }
        
        // Reset warnings
        function resetWarnings() {
            warningCount = 0;
            document.getElementById('warningSimulation').className = 'warning-simulation';
            document.getElementById('blockSimulation').className = 'block-simulation';
            updateStats();
        }
        
        // Clear history
        function clearHistory() {
            queryHistory = [];
            warningCount = 0;
            updateHistoryTable();
            updateStats();
            document.getElementById('warningSimulation').className = 'warning-simulation';
            document.getElementById('blockSimulation').className = 'block-simulation';
        }
        
        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('currentTopics').textContent = studyTopics.join(', ');
        });
