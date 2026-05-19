import logoImage from '../../이미지/로고/logo.png';

const ENABLE_DEV_MODE = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_MODE === '1';

export default function DnfHellToolMarkup() {
  return (
    <div className={'wrap'}>
      <section className={'hero'}>
        <h1 className={'site-logo-heading'}>
          <img className={'site-logo-image'} src={logoImage} alt={'던파일럿'} />
        </h1>
        <div className={'tab-bar'} role={'tablist'} aria-label={'계산기 탭'}>
          <button type={'button'} className={'tab-button active'} id={'enchantTabButton'} data-tab-target={'enchantPanel'} aria-selected={'true'}>스펙업 순서</button>
          <button type={'button'} className={'tab-button'} id={'hellTabButton'} data-tab-target={'hellPanel'} aria-selected={'false'}>헬 계산기</button>
          <button type={'button'} className={'tab-button'} id={'supplyTabButton'} data-tab-target={'supplyPanel'} aria-selected={'false'}>계시 관리</button>
        </div>
      </section>
      <section className={'grid tab-panel'} id={'hellPanel'} hidden>
        <aside className={'panel'}>
          <h2>입력</h2>
          <div className={'form-grid'}>
            <div className={'field field-wide character-search-field'}>
              <label>캐릭터 검색</label>
              <div className={'loader-status dev-only'}>별도 이름 없이 이 컴퓨터 저장소에 자동 저장됩니다. 같은 브라우저/컴퓨터에서 다시 열면 유지됩니다.</div>
              <div className={'search-row'}>
                <select id={'serverIdInput'} defaultValue={'cain'}>
                  <option value={'cain'}>카인</option>
                  <option value={'diregie'}>디레지에</option>
                  <option value={'siroco'}>시로코</option>
                  <option value={'prey'}>프레이</option>
                  <option value={'casillas'}>카시야스</option>
                  <option value={'hilder'}>힐더</option>
                  <option value={'anton'}>안톤</option>
                  <option value={'bakal'}>바칼</option>
                </select>
                <input id={'characterNameInput'} type={'text'} placeholder={'캐릭터명'} />
                <button type={'button'} className={'ghost-button'} id={'addCharacterButton'}>추가</button>
                <button type={'button'} className={'ghost-button'} id={'refreshCharactersButton'}>전체 갱신</button>
                <button type={'button'} className={'ghost-button'} id={'clearCharactersButton'}>목록 초기화</button>
              </div>
              <div className={'loader-status'} id={'searchStatus'}>API 대기</div>
              <div className={'loader-status dev-only'}>
                파일로 열었다면
                <span className={'monospace-inline'}>python3 neople_hell_api_server.py</span>
                를 먼저 실행해 주세요.
              </div>
              <label htmlFor={'charactersJson'} className={'dev-only label-offset-top'}>자동 생성 결과 미리보기</label>
              <textarea id={'charactersJson'} readOnly className={'dev-only'} defaultValue={'[]'}></textarea>
              <div className={'error'} id={'error'}></div>
            </div>
            <div className={'slider-wrap'}>
              <div className={'slider-head'}>
                <div>
                  <div className={'percentile-section-label'} id={'percentileSectionLabel'}>상위</div>
                  <div className={'slider-value'}>
                    <span id={'percentileLabel'}>66</span>
                  </div>
                </div>
                <div className={'field field-narrow-number'}>
                  <label htmlFor={'percentileNumber'} id={'percentileNumberLabel'}>숫자 입력</label>
                  <input id={'percentileNumber'} type={'number'} min={'1'} max={'99'} step={'1'} defaultValue={'66'} />
                </div>
              </div>
              <input id={'percentileRange'} type={'range'} min={'1'} max={'99'} step={'1'} defaultValue={'66'} />
            </div>
            <div className={'field dev-only'}>
              <label htmlFor={'setCount'}>전체 세트 수</label>
              <input id={'setCount'} type={'number'} min={'1'} step={'1'} defaultValue={'12'} />
            </div>
            <div className={'field dev-only'}>
              <label htmlFor={'epicRate'}>에픽 드랍률(%)</label>
              <input id={'epicRate'} type={'number'} min={'0'} max={'100'} step={'0.001'} defaultValue={'2.1113'} />
            </div>
            <div className={'field dev-only'}>
              <label htmlFor={'taechoRate'}>태초 드랍률(%)</label>
              <input id={'taechoRate'} type={'number'} min={'0'} max={'100'} step={'0.001'} defaultValue={'0.2404'} />
            </div>
            <div className={'field dev-only'}>
              <label htmlFor={'hellPerRun'}>한판 계시량</label>
              <input id={'hellPerRun'} type={'number'} min={'0'} step={'0.001'} defaultValue={'44'} />
            </div>
            <div className={'field dev-only'}>
              <label htmlFor={'recoveryAmount'}>계시 회수량</label>
              <input id={'recoveryAmount'} type={'number'} min={'0'} step={'0.001'} defaultValue={'14.60'} />
              <button type={'button'} className={'ghost-button'} id={'applySupplyHellCalcButton'}>계시 관리 값 적용</button>
              <div className={'hell-calc-meta'} id={'supplyHellCalcMeta'}></div>
            </div>
            <div className={'field dev-only'}>
              <label htmlFor={'epicCraftCost'}>에픽 정가 비용</label>
              <input id={'epicCraftCost'} type={'number'} min={'0'} step={'1'} defaultValue={'9800'} />
            </div>
            <div className={'field dev-only'}>
              <label htmlFor={'taechoCraftCost'}>태초 정가 비용</label>
              <input id={'taechoCraftCost'} type={'number'} min={'0'} step={'1'} defaultValue={'45000'} />
            </div>
            <div className={'field dev-only'}>
              <label htmlFor={'trials'}>캐릭당 시뮬레이션 횟수</label>
              <input id={'trials'} type={'number'} min={'500'} step={'500'} defaultValue={'3000'} />
            </div>
            <div className={'field field-wide'}>
              <label htmlFor={'selectedCharacter'}>상세 보기 캐릭</label>
              <select id={'selectedCharacter'}></select>
            </div>
          </div>
        </aside>
        <main className={'stack'}>
          <section className={'panel section'}>
            <h2>전체 요약</h2>
            <div className={'cards'}>
              <div className={'card'}>
                <div className={'label'}>캐릭 수</div>
                <div className={'value'} id={'totalCharacters'}>-</div>
                <div className={'sub'}>현재 로드된 캐릭 수</div>
              </div>
              <div className={'card'}>
                <div className={'label'} id={'selectedPercentileCardLabel'}>상위</div>
                <div className={'value'} id={'selectedPercentileCard'}>-</div>
                <div className={'sub'}>전체 비교 기준</div>
              </div>
              <div className={'card'}>
                <div className={'label'}>계산 상태</div>
                <div className={'value card-value-compact'} id={'calcState'}>대기</div>
                <div className={'sub'} id={'calcMeta'}>-</div>
                <div className={'sub dev-only'} id={'calcMetaDev'}>-</div>
              </div>
              <div className={'card dev-only'}>
                <div className={'label'}>요약</div>
                <div className={'value card-value-compact'} id={'overviewSummary'}>-</div>
                <div className={'sub'}>헬 유지 / 경계 / 정가 우선 분포</div>
              </div>
            </div>
            <div className={'table-scroll table-scroll-overview'}>
              <table className={'overview-table'}>
                <thead>
                  <tr>
                    <th scope={'col'}>
                      <button type={'button'} className={'sort-button'} data-sort-key={'name'}>
                        <span>캐릭</span>
                        <span className={'sort-arrow'} aria-hidden={'true'}></span>
                      </button>
                    </th>
                    <th scope={'col'}>
                      <button type={'button'} className={'sort-button'} data-sort-key={'selectedHellCost'}>
                        <span>유효 세트 헬 비용</span>
                        <span className={'sort-arrow'} aria-hidden={'true'}></span>
                      </button>
                    </th>
                    <th scope={'col'}>
                      <button type={'button'} className={'sort-button'} data-sort-key={'craftCost'}>
                        <span>최저 정가 비용</span>
                        <span className={'sort-arrow'} aria-hidden={'true'}></span>
                      </button>
                    </th>
                    <th scope={'col'}>
                      <button type={'button'} className={'sort-button'} data-sort-key={'ratio'}>
                        <span>비율</span>
                        <span className={'sort-arrow'} aria-hidden={'true'}></span>
                      </button>
                    </th>
                    <th>판정</th>
                    <th>최저 정가 루트</th>
                    <th>삭제</th>
                  </tr>
                </thead>
              <tbody id={'overviewTableBody'}></tbody>
              </table>
            </div>
          </section>
          <section className={'panel section'}>
            <h2>선택 캐릭 상세</h2>
            <div className={'summary-box'}>
              <strong id={'detailTitle'}>-</strong>
              <div id={'detailSummary'}>-</div>
              <div id={'detailBadge'} className={'badge warn'}>대기</div>
            </div>
            <div className={'cards detail-summary-cards'}>
              <div className={'card'}>
                <div className={'label'}>유효 세트 헬 졸업 비용 (3태초+8에픽)</div>
                <div className={'value'} id={'selectedHellCost'}>-</div>
                <div className={'sub'} id={'selectedHellRuns'}>-</div>
              </div>
              <div className={'card'}>
                <div className={'label'}>최저 정가 비용</div>
                <div className={'value'} id={'craftCost'}>-</div>
                <div className={'sub'} id={'craftRoute'}>-</div>
              </div>
              <div className={'card'}>
                <div className={'label'}>분기 판정</div>
                <div className={'value card-value-compact'} id={'verdictText'}>-</div>
                <div className={'sub'} id={'verdictSub'}>-</div>
              </div>
              <div className={'card dev-only'}>
                <div className={'label'}>P50 / P66 / P80</div>
                <div className={'value card-value-compact'} id={'quantileCompact'}>-</div>
                <div className={'sub'}>유효 세트 중 1개 졸업 비용</div>
              </div>
            </div>
            <div className={'split'}>
              <div className={'panel dev-only panel-inner'}>
                <h2 className={'section-title-tight'}>고급 결과</h2>
                <div className={'cards detail-advanced-cards'}>
                  <div className={'card'}>
                    <div className={'label'}>P50</div>
                    <div className={'value'} id={'p50Cost'}>-</div>
                    <div className={'sub'} id={'p50Runs'}>-</div>
                  </div>
                  <div className={'card'}>
                    <div className={'label'}>P66</div>
                    <div className={'value'} id={'p66Cost'}>-</div>
                    <div className={'sub'} id={'p66Runs'}>-</div>
                  </div>
                  <div className={'card'}>
                    <div className={'label'}>P80</div>
                    <div className={'value'} id={'p80Cost'}>-</div>
                    <div className={'sub'} id={'p80Runs'}>-</div>
                  </div>
                  <div className={'card'}>
                    <div className={'label'}>Mean</div>
                    <div className={'value'} id={'meanCost'}>-</div>
                    <div className={'sub'} id={'meanRuns'}>-</div>
                  </div>
                </div>
              </div>
              <div className={'panel panel-inner'}>
                <h2 className={'section-title-tight'}>세트별 정가 결손 (3태초 + 8에픽 기준)</h2>
                <div className={'table-scroll table-scroll-set'}>
                  <table>
                    <thead>
                      <tr>
                        <th>유효 세트</th>
                        <th>현재 태초</th>
                        <th>현재 에픽</th>
                        <th>태초 결손</th>
                        <th>에픽 결손</th>
                        <th>정가 비용</th>
                      </tr>
                    </thead>
                    <tbody id={'setTableBody'}></tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className={'foot'}>
              목표는<strong>살아있는 세트 중 하나가 3태초 + 8에픽 완성</strong>
              상태가 되는 순간입니다.
              즉, 태초 3칸과 에픽 8칸을 별도 슬롯으로 보고 계산합니다.
              헬 1판 순원가는
              <strong>한판 계시량 - 회수 계시량</strong>
              으로 계산합니다.
            </div>
          </section>
        </main>
      </section>
      <section className={'grid tab-panel'} id={'enchantPanel'}>
        <aside className={'panel'}>
          <h2>스펙업 순서</h2>
          <div className={'supply-note'}>
            모든 스펙업 요소들을 골드 대비 딜 상승 효율을 정렬합니다.
          </div>
          <div className={'loader-row supply-input-row enchant-input-row'}>
            <div className={'field'}>
              <label htmlFor={'enchantServerIdInput'}>서버</label>
              <select id={'enchantServerIdInput'} defaultValue={'cain'}>
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
              <label htmlFor={'enchantCharacterNameInput'}>캐릭터명</label>
              <input id={'enchantCharacterNameInput'} type={'text'} placeholder={'캐릭터명'} />
            </div>
            <button type={'button'} className={'ghost-button enchant-search-button'} id={'loadEnchantCharacterButton'}>검색</button>
          </div>
          <div className={'loader-status'} id={'enchantCharacterStatus'}>선택 캐릭터 기준</div>
          <div className={'loader-actions'}>
            <button type={'button'} className={'ghost-button'} id={'refreshEnchantCardsButton'}>시세 새로고침</button>
          </div>
          <div className={'loader-status'} id={'enchantStatus'}></div>
        </aside>
        <section className={'panel enchant-include-card'}>
          <div className={'enchant-include-title'}>포함 항목</div>
          <div className={'enchant-include-controls'} id={'enchantIncludeControls'}></div>
        </section>
        <main className={'stack'}>
          <section className={'panel section'}>
            <div className={'enchant-recommend-head'}>
              <h2>
                <span>스펙업 순서 추천</span>
                <span className={'enchant-efficiency-help'} tabIndex={0} aria-label={'효율 색상 기준'}>?</span>
              </h2>
              <div className={'enchant-efficiency-legend'} id={'enchantEfficiencyLegend'}></div>
            </div>
            <div className={'enchant-recommend-grid'} id={'enchantRecommendList'}>
              <div className={'table-empty-cell'}>시세를 먼저 불러와 주세요.</div>
            </div>
          </section>
        </main>
      </section>
      <section className={'grid tab-panel'} id={'supplyPanel'} hidden>
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
              <input id={'supplyCharacterNameInput'} type={'text'} placeholder={'캐릭터명'} />
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
      {ENABLE_DEV_MODE ? (
        <div className={'utility-footer'}>
          <button type={'button'} className={'ghost-button footer-dev-toggle'} id={'devModeToggle'} aria-pressed={'false'}>개발자 모드</button>
        </div>
      ) : null}
    </div>
  );
}
