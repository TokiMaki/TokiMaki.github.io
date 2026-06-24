export default function RevelationManagerTab() {
  return (
      <section className={'grid tab-panel dev-only'} id={'supplyPanel'} hidden>
        <aside className={'panel'}>
          <h2>계시 관리 입력</h2>
          <div className={'supply-note'}>
            서버, 캐릭터명을 입력후 추가 버튼을 누르면 캐릭터가 목록에 추가됩니다.
          </div>
          <div className={'loader-row supply-input-row'}>
            <div className={'field'}>
              <label htmlFor={'supplyServerIdInput'}>서버</label>
              <select id={'supplyServerIdInput'} defaultValue={'cain'}>
                <option value={'cain'}>카인</option>
                <option value={'diregie'}>디레지에</option>
                <option value={'siroco'}>시로코</option>
                <option value={'prey'}>프레이</option>
                <option value={'casillas'}>카시야스</option>
                <option value={'hilder'}>힐더</option>
                <option value={'anton'}>안톤</option>
                <option value={'bakal'}>바칼</option>
              </select>
            </div>
            <div className={'field'}>
              <label htmlFor={'supplyCharacterNameInput'}>캐릭터명</label>
              <input id={'supplyCharacterNameInput'} type={'search'} placeholder={'캐릭터명'} autoComplete={'off'} enterKeyHint={'search'} />
            </div>
          </div>
          <div className={'loader-actions supply-input-actions'}>
            <button type={'button'} className={'ghost-button'} id={'addSupplyCharacterButton'}>추가</button>
            <button type={'button'} className={'ghost-button'} id={'refreshSupplyCharactersButton'}>전체 갱신</button>
            <button type={'button'} className={'ghost-button'} id={'resetSupplySelectionsButton'}>전체 기본 복원</button>
            <button type={'button'} className={'ghost-button'} id={'enableAllSupplyHellsButton'}>헬 일괄 선택</button>
            <button type={'button'} className={'ghost-button'} id={'disableAllSupplyHellsButton'}>헬 일괄 해제</button>
            <button type={'button'} className={'ghost-button'} id={'clearSupplyCharactersButton'}>목록 초기화</button>
          </div>
          <div className={'loader-status'} id={'supplySearchStatus'}>API 대기</div>
          <div className={'error'} id={'supplyError'}></div>
        </aside>
        <main className={'stack'}>
          <section className={'panel section supply-summary-section'}>
            <h2>캐릭터 목록</h2>
            <div className={'supply-roster-layout supply-roster-block'}>
              <div className={'supply-roster-column'}>
                <div className={'supply-roster-head'}>
                  <div className={'supply-roster-head-main'}>
                    <div className={'supply-category-title'}>헬 돌릴 캐릭</div>
                    <div className={'supply-limit-pill'} id={'supplyHellRosterCount'}>0</div>
                  </div>
                </div>
                <div className={'supply-roster-list'} id={'supplyHellRosterList'}></div>
              </div>
              <div className={'supply-roster-actions'}>
                <button type={'button'} className={'ghost-button supply-roster-move'} id={'moveSupplyToHellButton'}>←</button>
                <button type={'button'} className={'ghost-button supply-roster-move'} id={'moveSupplyToAltButton'}>→</button>
              </div>
              <div className={'supply-roster-column'}>
                <div className={'supply-roster-head'}>
                  <div className={'supply-roster-head-main'}>
                    <div className={'supply-category-title'}>배럭용 캐릭</div>
                    <div className={'supply-limit-pill'} id={'supplyAltRosterCount'}>0</div>
                  </div>
                  <div className={'supply-roster-head-actions supply-roster-head-spacer'} aria-hidden={'true'}></div>
                </div>
                <div className={'supply-roster-list'} id={'supplyAltRosterList'}></div>
              </div>
            </div>
            <h2>전체 요약</h2>
            <div className={'supply-summary-layout'}>
              <div className={'supply-summary-main'}>
                <div className={'card supply-total-soul-card'}>
                  <div className={'label'}>주간 총 소울 수급량</div>
                  <div className={'value'} id={'supplyTotalSoul'}>-</div>
                  <div className={'supply-soul-exclude-controls'} id={'supplySoulExcludeControls'}></div>
                  <div className={'sub'} id={'supplyTotalSoulSub'}>-</div>
                </div>
              </div>
              <div className={'supply-summary-side'}>
                <div className={'cards supply-summary-cards'}>
                  <div className={'card supply-summary-card supply-summary-card-primary'}>
                    <div className={'supply-summary-primary-main'}>
                      <div className={'label'}>초기화까지 필요량</div>
                      <div className={'value'} id={'supplyTotalResetUsage'}>-</div>
                      <div className={'sub'}>다음 목요일 6시 전까지</div>
                    </div>
                    <div className={'supply-summary-primary-side'}>
                      <div className={'supply-summary-mini'}>
                        <div className={'label'}>주간 필요량</div>
                        <div className={'value'} id={'supplyTotalUsage'}>-</div>
                        <div className={'sub'}>이번 주 전체 기준</div>
                      </div>
                      <div className={'supply-summary-mini'}>
                        <div className={'label'}>오늘 필요량</div>
                        <div className={'value'} id={'supplyTotalTodayUsage'}>-</div>
                        <div className={'sub'}>오늘 하루 기준</div>
                      </div>
                    </div>
                  </div>
                  <div className={'card supply-summary-card supply-summary-card-income'}>
                    <div className={'label'}>주간 계귀계시 수급량</div>
                    <div className={'value'} id={'supplyTotalAccount'}>-</div>
                    <div className={'sub'} id={'supplyTotalAccountSub'}></div>
                  </div>
                  <div className={'card supply-summary-card supply-summary-card-income'}>
                    <div className={'label'}>주간 이벤트 수급량</div>
                    <div className={'value'} id={'supplyTotalEvent'}>-</div>
                    <div className={'sub'} id={'supplyTotalEventSub'}>-</div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <section className={'panel section'}>
            <h2>선택 캐릭 상세</h2>
            <div className={'supply-detail-layout'}>
              <div className={'supply-detail-left'}>
                <div className={'card supply-detail-portrait-card'}>
                  <div className={'supply-detail-portrait'} id={'supplyDetailTitle'}>-</div>
                </div>
              </div>
              <div className={'supply-detail-middle'}>
                <div className={'cards supply-detail-cards supply-detail-stat-stack'}>
                  <div className={'card supply-detail-need-split'}>
                    <div className={'supply-detail-need-item'}>
                      <div className={'label'}>주간 필요량</div>
                      <div className={'value'} id={'supplyDetailUsage'}>-</div>
                      <div className={'sub'} id={'supplyDetailUsageSub'}>-</div>
                    </div>
                    <div className={'supply-detail-need-item'}>
                      <div className={'label'}>오늘 필요량</div>
                      <div className={'value'} id={'supplyDetailTodayNeed'}>-</div>
                      <div className={'sub'} id={'supplyDetailTodayNeedSub'}></div>
                    </div>
                  </div>
                  <div className={'card'}>
                    <div className={'supply-detail-hell-inline'}>
                      <div className={'supply-detail-hell-item'}>
                        <div className={'label'}>주간 헬 판수</div>
                        <div className={'value'} id={'supplyDetailHell'}>-</div>
                        <div className={'sub'} id={'supplyDetailHellSub'}>-</div>
                      </div>
                      <div className={'supply-detail-hell-item'}>
                        <div className={'label'}>오늘 헬 판수</div>
                        <div className={'value'} id={'supplyDetailTodayHell'}>-</div>
                        <div className={'sub'} id={'supplyDetailTodayHellSub'}>-</div>
                      </div>
                    </div>
                  </div>
                  <div className={'card'}>
                    <div className={'label'}>교불계시 수급량</div>
                    <div className={'value'} id={'supplyDetailBound'}>-</div>
                    <div className={'sub'} id={'supplyDetailBoundSub'}></div>
                  </div>
                  <div className={'card'}>
                    <div className={'label'}>계귀계시 수급량</div>
                    <div className={'value'} id={'supplyDetailAccount'}>-</div>
                  </div>
                </div>
              </div>
              <div className={'supply-detail-recovery-column'}>
                <div className={'card'}>
                  <div className={'label'}>소울 수급량</div>
                  <div className={'value'} id={'supplyDetailRecovery'}>-</div>
                  <div className={'sub'} id={'supplyDetailRecoverySub'}>-</div>
                </div>
              </div>
              <div className={'supply-detail-right'}>
                <div id={'supplyDetailEditor'}></div>
              </div>
            </div>
            <div className={'panel supply-content-panel'}>
              <div className={'supply-content-panel-head'}>
                <strong className={'supply-content-title'}>컨텐츠 선택</strong>
                <div className={'supply-preset-row'}>
                  <button type={'button'} className={'ghost-button'} data-supply-preset={'last-task-apostate'}>과업+배교자</button>
                  <button type={'button'} className={'ghost-button'} data-supply-preset={'apocalypse-2'}>아포칼립스 2단</button>
                  <button type={'button'} className={'ghost-button'} data-supply-preset={'apostate-starbook'}>배교자+별거북</button>
                  <button type={'button'} className={'ghost-button'} data-supply-preset={'apocalypse-1'}>아포칼립스 1단</button>
                  <button type={'button'} className={'ghost-button'} data-supply-preset={'starbook-dream'}>별거북+흉몽</button>
                </div>
                <div className={'supply-preset-row supply-preset-row-spaced'}>
                  <button type={'button'} className={'ghost-button'} data-supply-preset={'apocalypse-match'}>아포칼립스 매칭</button>
                  <button type={'button'} className={'ghost-button'} data-supply-preset={'dream-goddess'}>흉몽+여신전</button>
                  <button type={'button'} className={'ghost-button'} data-supply-preset={'diregie-match'}>디레 매칭</button>
                  <button type={'button'} className={'ghost-button'} data-supply-preset={'venus-2'}>베누스 2단</button>
                  <button type={'button'} className={'ghost-button'} data-supply-preset={'goddess-azure'}>여신전+애쥬어</button>
                  <button type={'button'} className={'ghost-button'} data-supply-preset={'azure-lake'}>애쥬어+호수</button>
                </div>
                <div className={'supply-preset-row supply-preset-row-spaced'}>
                  <button type={'button'} className={'ghost-button'} data-supply-preset={'apocalypse-carry'}>아포칼립스 업둥/쩔</button>
                  <button type={'button'} className={'ghost-button'} data-supply-preset={'diregie-carry'}>디레지에 업둥/쩔</button>
                  <button type={'button'} className={'ghost-button'} data-supply-preset={'all-carry'}>전체 쩔/업둥</button>
                  <button type={'button'} className={'ghost-button'} data-supply-preset={'default-selection'}>자동 선택</button>
                </div>
              </div>
              <div className={'supply-check-grid'} id={'supplyContentControls'}></div>
            </div>
            <div className={'table-scroll table-scroll-supply-detail'}>
              <table>
                <thead>
                  <tr>
                    <th>콘텐츠</th>
                    <th>장비 배율</th>
                    <th>조율자 배율</th>
                    <th>교불 계시</th>
                    <th>계귀 계시</th>
                  </tr>
                </thead>
                <tbody id={'supplyDetailTableBody'}></tbody>
              </table>
            </div>
          </section>
        </main>
      </section>
  );
}
